import type {
  Ingredient,
  IngredientCreate,
  IngredientUpdate,
  IngredientUsageResolved,
  Recipe,
  RecipeCreate,
  RecipeUpdate,
  RecipeUsageResolved,
  Dish,
  DishCreate,
  DishUpdate,
} from '@soliluna/shared';
import {
  calculateIngredientCost,
  calculateRecipeCost,
} from '@soliluna/shared';
import type { Unit, RecipeUnit } from '@soliluna/shared';
import type { D1Database, D1PreparedStatement } from './d1.ts';

// ─── Row types (snake_case as stored in D1) ─────────────────────────

interface IngredientRow {
  id: string;
  name: string;
  pkg_size: number;
  pkg_unit: string;
  pkg_price: number;
  created_at: string;
  updated_at: string;
}

interface RecipeRow {
  id: string;
  name: string;
  yield_amount: number;
  yield_unit: string;
  created_at: string;
  updated_at: string;
}

interface RecipeIngredientRow {
  recipe_id: string;
  ingredient_id: string;
  amount: number;
  unit: string;
}

interface DishRow {
  id: string;
  name: string;
  pax: number;
  delivery_date: string | null;
  notes: string;
  multiplier: number;
  created_at: string;
  updated_at: string;
}

interface DishIngredientRow {
  dish_id: string;
  ingredient_id: string;
  amount: number;
  unit: string;
}

interface DishRecipeRow {
  dish_id: string;
  recipe_id: string;
  amount: number;
  unit: string;
}

interface DeletionRow {
  entity: string;
  entity_id: string;
  deleted_at: string;
}

// ─── Row ↔ API conversion helpers ───────────────────────────────────

function ingredientFromRow(row: IngredientRow): Ingredient {
  return {
    id: row.id,
    name: row.name,
    pkgSize: row.pkg_size,
    pkgUnit: row.pkg_unit as Unit,
    pkgPrice: row.pkg_price,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function recipeMetadataFromRow(row: RecipeRow) {
  return {
    id: row.id,
    name: row.name,
    yieldAmount: row.yield_amount,
    yieldUnit: row.yield_unit as RecipeUnit,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dishMetadataFromRow(row: DishRow) {
  return {
    id: row.id,
    name: row.name,
    pax: row.pax,
    deliveryDate: row.delivery_date,
    notes: row.notes,
    multiplier: row.multiplier,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Ingredient cost resolution ─────────────────────────────────────

function resolveIngredientUsageCost(
  usage: { ingredient_id: string; amount: number; unit: string },
  ingredientMap: Map<string, Ingredient>,
): IngredientUsageResolved {
  const ingredient = ingredientMap.get(usage.ingredient_id);

  if (!ingredient) {
    return {
      ingredientId: usage.ingredient_id,
      amount: usage.amount,
      unit: usage.unit as Unit,
      name: '(desconocido)',
      cost: null,
    };
  }

  const cost = calculateIngredientCost(ingredient, usage.amount, usage.unit as Unit);

  return {
    ingredientId: usage.ingredient_id,
    amount: usage.amount,
    unit: usage.unit as Unit,
    name: ingredient.name,
    cost,
  };
}

// ─── SQL timestamp helper ───────────────────────────────────────────

const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%f','now')";

// ─── Ingredients ───

export async function listIngredients(db: D1Database): Promise<Ingredient[]> {
  const { results } = await db
    .prepare('SELECT * FROM ingredients ORDER BY name')
    .all<IngredientRow>();

  return results.map(ingredientFromRow);
}

export async function getIngredient(db: D1Database, id: string): Promise<Ingredient | null> {
  const row = await db
    .prepare('SELECT * FROM ingredients WHERE id = ?')
    .bind(id)
    .first<IngredientRow>();

  return row ? ingredientFromRow(row) : null;
}

export async function createIngredient(db: D1Database, data: IngredientCreate): Promise<Ingredient> {
  await db
    .prepare(
      `INSERT INTO ingredients (id, name, pkg_size, pkg_unit, pkg_price)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(data.id, data.name, data.pkgSize, data.pkgUnit, data.pkgPrice)
    .run();

  const created = await getIngredient(db, data.id);
  return created!;
}

export async function updateIngredient(
  db: D1Database,
  id: string,
  data: IngredientUpdate,
): Promise<Ingredient> {
  await db
    .prepare(
      `UPDATE ingredients
       SET name = ?, pkg_size = ?, pkg_unit = ?, pkg_price = ?, updated_at = ${NOW_SQL}
       WHERE id = ?`,
    )
    .bind(data.name, data.pkgSize, data.pkgUnit, data.pkgPrice, id)
    .run();

  const updated = await getIngredient(db, id);
  return updated!;
}

/** Returns null if deletion succeeded, or an error message if the ingredient is in use. */
export async function deleteIngredient(
  db: D1Database,
  id: string,
): Promise<{ error: string } | null> {
  const usedInRecipe = await db
    .prepare('SELECT 1 FROM recipe_ingredients WHERE ingredient_id = ? LIMIT 1')
    .bind(id)
    .first();

  if (usedInRecipe) {
    return { error: 'Ingredient is used in one or more recipes' };
  }

  const usedInDish = await db
    .prepare('SELECT 1 FROM dish_ingredients WHERE ingredient_id = ? LIMIT 1')
    .bind(id)
    .first();

  if (usedInDish) {
    return { error: 'Ingredient is used in one or more dishes' };
  }

  await db.batch([
    db.prepare('DELETE FROM ingredients WHERE id = ?').bind(id),
    db
      .prepare('INSERT OR REPLACE INTO deletions (entity, entity_id) VALUES (?, ?)')
      .bind('ingredient', id),
  ]);

  return null;
}

// ─── In-Memory Assembly ───
// Resolving relations row by row is one query per recipe and several per dish,
// which is how /api/sync/changes fired a thousand subrequests and died with a
// 500. Everything below takes whole tables and joins them here.

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const arr = groups.get(key(row));
    if (arr) arr.push(row);
    else groups.set(key(row), [row]);
  }
  return groups;
}

function indexIngredients(rows: IngredientRow[]): Map<string, Ingredient> {
  return new Map(rows.map((row) => [row.id, ingredientFromRow(row)]));
}

function assembleRecipe(
  row: RecipeRow,
  riRows: RecipeIngredientRow[],
  ingredientMap: Map<string, Ingredient>,
): Recipe {
  const ingredients: IngredientUsageResolved[] = riRows.map((ri) =>
    resolveIngredientUsageCost(ri, ingredientMap),
  );
  const cost = ingredients.reduce((sum, ing) => sum + (ing.cost ?? 0), 0);

  return { ...recipeMetadataFromRow(row), ingredients, cost };
}

function assembleRecipeMap(
  recipeRows: RecipeRow[],
  riRows: RecipeIngredientRow[],
  ingredientMap: Map<string, Ingredient>,
): Map<string, Recipe> {
  const riByRecipe = groupBy(riRows, (ri) => ri.recipe_id);
  return new Map(
    recipeRows.map((row) => [
      row.id,
      assembleRecipe(row, riByRecipe.get(row.id) ?? [], ingredientMap),
    ]),
  );
}

function assembleDish(
  row: DishRow,
  diRows: DishIngredientRow[],
  drRows: DishRecipeRow[],
  recipeMap: Map<string, Recipe>,
  ingredientMap: Map<string, Ingredient>,
): Dish {
  const metadata = dishMetadataFromRow(row);

  const ingredients: IngredientUsageResolved[] = diRows.map((di) =>
    resolveIngredientUsageCost(di, ingredientMap),
  );

  const recipes: RecipeUsageResolved[] = drRows.map((dr) => {
    const recipe = recipeMap.get(dr.recipe_id);

    if (!recipe) {
      return {
        recipeId: dr.recipe_id,
        amount: dr.amount,
        unit: dr.unit as RecipeUnit,
        name: '(desconocido)',
        cost: -1,
      };
    }

    return {
      recipeId: dr.recipe_id,
      amount: dr.amount,
      unit: dr.unit as RecipeUnit,
      name: recipe.name,
      cost: calculateRecipeCost(recipe, dr.amount),
    };
  });

  const ingredientsCost = ingredients.reduce((sum, ing) => sum + (ing.cost ?? 0), 0);
  const recipesCost = recipes.reduce((sum, rec) => sum + (rec.cost ?? 0), 0);
  const baseCost = ingredientsCost + recipesCost;

  return { ...metadata, ingredients, recipes, baseCost, finalPrice: baseCost * metadata.multiplier };
}

// ─── Recipes ───

async function buildRecipeWithIngredients(
  db: D1Database,
  row: RecipeRow,
): Promise<Recipe> {
  const { results: riRows } = await db
    .prepare('SELECT * FROM recipe_ingredients WHERE recipe_id = ?')
    .bind(row.id)
    .all<RecipeIngredientRow>();

  const ingredientMap = await fetchIngredientMap(db, riRows.map((ri) => ri.ingredient_id));

  return assembleRecipe(row, riRows, ingredientMap);
}

export async function listRecipes(db: D1Database): Promise<Recipe[]> {
  const [recipeResult, riResult, ingredientResult] = await db.batch([
    db.prepare('SELECT * FROM recipes ORDER BY name'),
    db.prepare('SELECT * FROM recipe_ingredients'),
    db.prepare('SELECT * FROM ingredients'),
  ]);

  const recipeRows = recipeResult.results as unknown as RecipeRow[];
  const riByRecipe = groupBy(riResult.results as unknown as RecipeIngredientRow[], (ri) => ri.recipe_id);
  const ingredientMap = indexIngredients(ingredientResult.results as unknown as IngredientRow[]);

  return recipeRows.map((row) =>
    assembleRecipe(row, riByRecipe.get(row.id) ?? [], ingredientMap),
  );
}

export async function getRecipe(db: D1Database, id: string): Promise<Recipe | null> {
  const row = await db
    .prepare('SELECT * FROM recipes WHERE id = ?')
    .bind(id)
    .first<RecipeRow>();

  if (!row) return null;
  return buildRecipeWithIngredients(db, row);
}

export async function createRecipe(db: D1Database, data: RecipeCreate): Promise<Recipe> {
  await db
    .prepare(
      `INSERT INTO recipes (id, name, yield_amount, yield_unit)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(data.id, data.name, data.yieldAmount, data.yieldUnit)
    .run();

  const created = await getRecipe(db, data.id);
  return created!;
}

export async function updateRecipe(
  db: D1Database,
  id: string,
  data: RecipeUpdate,
): Promise<Recipe> {
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `UPDATE recipes
         SET name = ?, yield_amount = ?, yield_unit = ?, updated_at = ${NOW_SQL}
         WHERE id = ?`,
      )
      .bind(data.name, data.yieldAmount, data.yieldUnit, id),

    // Replace all ingredient associations: delete old, insert new
    db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').bind(id),

    ...data.ingredients.map((ing) =>
      db
        .prepare(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit)
           VALUES (?, ?, ?, ?)`,
        )
        .bind(id, ing.ingredientId, ing.amount, ing.unit),
    ),
  ];

  await db.batch(statements);

  const updated = await getRecipe(db, id);
  return updated!;
}

/** Returns null if deletion succeeded, or an error message if the recipe is in use. */
export async function deleteRecipe(
  db: D1Database,
  id: string,
): Promise<{ error: string } | null> {
  const usedInDish = await db
    .prepare('SELECT 1 FROM dish_recipes WHERE recipe_id = ? LIMIT 1')
    .bind(id)
    .first();

  if (usedInDish) {
    return { error: 'Recipe is used in one or more dishes' };
  }

  await db.batch([
    db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').bind(id),
    db.prepare('DELETE FROM recipes WHERE id = ?').bind(id),
    db
      .prepare('INSERT OR REPLACE INTO deletions (entity, entity_id) VALUES (?, ?)')
      .bind('recipe', id),
  ]);

  return null;
}

// ─── Dishes ───

async function buildDishWithRelations(
  db: D1Database,
  row: DishRow,
): Promise<Dish> {
  const [diResult, drResult] = await db.batch([
    db.prepare('SELECT * FROM dish_ingredients WHERE dish_id = ?').bind(row.id),
    db.prepare('SELECT * FROM dish_recipes WHERE dish_id = ?').bind(row.id),
  ]);

  const diRows = diResult.results as unknown as DishIngredientRow[];
  const drRows = drResult.results as unknown as DishRecipeRow[];

  const recipes = await Promise.all(drRows.map((dr) => getRecipe(db, dr.recipe_id)));
  const recipeMap = new Map(
    recipes.filter((recipe): recipe is Recipe => recipe !== null).map((recipe) => [recipe.id, recipe]),
  );

  const ingredientMap = await fetchIngredientMap(db, diRows.map((di) => di.ingredient_id));

  return assembleDish(row, diRows, drRows, recipeMap, ingredientMap);
}

export async function listDishes(db: D1Database): Promise<Dish[]> {
  // Six queries whatever the size: the join happens in assembleDish.
  const [dishResult, diResult, drResult, recipeResult, riResult, ingredientResult] =
    await db.batch([
      db.prepare(
        `SELECT * FROM dishes
         ORDER BY
           CASE WHEN delivery_date IS NULL THEN 0 ELSE 1 END,
           delivery_date DESC`,
      ),
      db.prepare('SELECT * FROM dish_ingredients'),
      db.prepare('SELECT * FROM dish_recipes'),
      db.prepare('SELECT * FROM recipes'),
      db.prepare('SELECT * FROM recipe_ingredients'),
      db.prepare('SELECT * FROM ingredients'),
    ]);

  const dishRows = dishResult.results as unknown as DishRow[];
  const ingredientMap = indexIngredients(ingredientResult.results as unknown as IngredientRow[]);
  const recipeMap = assembleRecipeMap(
    recipeResult.results as unknown as RecipeRow[],
    riResult.results as unknown as RecipeIngredientRow[],
    ingredientMap,
  );
  const diByDish = groupBy(diResult.results as unknown as DishIngredientRow[], (di) => di.dish_id);
  const drByDish = groupBy(drResult.results as unknown as DishRecipeRow[], (dr) => dr.dish_id);

  return dishRows.map((row) =>
    assembleDish(
      row,
      diByDish.get(row.id) ?? [],
      drByDish.get(row.id) ?? [],
      recipeMap,
      ingredientMap,
    ),
  );
}

export async function getDish(db: D1Database, id: string): Promise<Dish | null> {
  const row = await db
    .prepare('SELECT * FROM dishes WHERE id = ?')
    .bind(id)
    .first<DishRow>();

  if (!row) return null;
  return buildDishWithRelations(db, row);
}

export async function createDish(db: D1Database, data: DishCreate): Promise<Dish> {
  await db
    .prepare(
      `INSERT INTO dishes (id, name, pax, delivery_date, notes, multiplier)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      data.id,
      data.name,
      data.pax,
      data.deliveryDate ?? null,
      data.notes ?? '',
      data.multiplier ?? 1,
    )
    .run();

  const created = await getDish(db, data.id);
  return created!;
}

export async function updateDish(
  db: D1Database,
  id: string,
  data: DishUpdate,
): Promise<Dish> {
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `UPDATE dishes
         SET name = ?, pax = ?, delivery_date = ?, notes = ?, multiplier = ?,
             updated_at = ${NOW_SQL}
         WHERE id = ?`,
      )
      .bind(
        data.name,
        data.pax,
        data.deliveryDate ?? null,
        data.notes ?? '',
        data.multiplier,
        id,
      ),

    // Replace direct ingredient associations
    db.prepare('DELETE FROM dish_ingredients WHERE dish_id = ?').bind(id),

    ...data.ingredients.map((ing) =>
      db
        .prepare(
          `INSERT INTO dish_ingredients (dish_id, ingredient_id, amount, unit)
           VALUES (?, ?, ?, ?)`,
        )
        .bind(id, ing.ingredientId, ing.amount, ing.unit),
    ),

    // Replace recipe associations
    db.prepare('DELETE FROM dish_recipes WHERE dish_id = ?').bind(id),

    ...data.recipes.map((rec) =>
      db
        .prepare(
          `INSERT INTO dish_recipes (dish_id, recipe_id, amount, unit)
           VALUES (?, ?, ?, ?)`,
        )
        .bind(id, rec.recipeId, rec.amount, rec.unit),
    ),
  ];

  await db.batch(statements);

  const updated = await getDish(db, id);
  return updated!;
}

export async function deleteDish(db: D1Database, id: string): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM dish_recipes WHERE dish_id = ?').bind(id),
    db.prepare('DELETE FROM dish_ingredients WHERE dish_id = ?').bind(id),
    db.prepare('DELETE FROM dishes WHERE id = ?').bind(id),
    db
      .prepare('INSERT OR REPLACE INTO deletions (entity, entity_id) VALUES (?, ?)')
      .bind('dish', id),
  ]);
}

// ─── Sync ───

export interface SyncChangesResult {
  ingredients: Ingredient[];
  recipes: Recipe[];
  dishes: Dish[];
  deletions: Array<{ entity: string; entityId: string; deletedAt: string }>;
}

export async function getChangesSince(
  db: D1Database,
  since: string,
): Promise<SyncChangesResult> {
  // The changed rows, plus whole tables: a dish that changed can use a recipe
  // that did not, and its cost still has to resolve. Nine queries, always.
  const [
    changedIngredients,
    changedRecipes,
    changedDishes,
    deletionResult,
    ingredientResult,
    recipeResult,
    riResult,
    diResult,
    drResult,
  ] = await db.batch([
    db.prepare('SELECT * FROM ingredients WHERE updated_at > ? ORDER BY name').bind(since),
    db.prepare('SELECT * FROM recipes WHERE updated_at > ? ORDER BY name').bind(since),
    db.prepare('SELECT * FROM dishes WHERE updated_at > ? ORDER BY name').bind(since),
    db.prepare('SELECT * FROM deletions WHERE deleted_at > ?').bind(since),
    db.prepare('SELECT * FROM ingredients'),
    db.prepare('SELECT * FROM recipes'),
    db.prepare('SELECT * FROM recipe_ingredients'),
    db.prepare('SELECT * FROM dish_ingredients'),
    db.prepare('SELECT * FROM dish_recipes'),
  ]);

  const ingredientMap = indexIngredients(ingredientResult.results as unknown as IngredientRow[]);
  const riByRecipe = groupBy(riResult.results as unknown as RecipeIngredientRow[], (ri) => ri.recipe_id);
  const recipeMap = assembleRecipeMap(
    recipeResult.results as unknown as RecipeRow[],
    riResult.results as unknown as RecipeIngredientRow[],
    ingredientMap,
  );
  const diByDish = groupBy(diResult.results as unknown as DishIngredientRow[], (di) => di.dish_id);
  const drByDish = groupBy(drResult.results as unknown as DishRecipeRow[], (dr) => dr.dish_id);

  const ingredients = (changedIngredients.results as unknown as IngredientRow[]).map(
    ingredientFromRow,
  );

  const recipes = (changedRecipes.results as unknown as RecipeRow[]).map((row) =>
    assembleRecipe(row, riByRecipe.get(row.id) ?? [], ingredientMap),
  );

  const dishes = (changedDishes.results as unknown as DishRow[]).map((row) =>
    assembleDish(
      row,
      diByDish.get(row.id) ?? [],
      drByDish.get(row.id) ?? [],
      recipeMap,
      ingredientMap,
    ),
  );

  const deletions = (deletionResult.results as unknown as DeletionRow[]).map((row) => ({
    entity: row.entity,
    entityId: row.entity_id,
    deletedAt: row.deleted_at,
  }));

  return { ingredients, recipes, dishes, deletions };
}

// ─── Conflict Detection ───

export async function getUpdatedAt(
  db: D1Database,
  table: 'ingredients' | 'recipes' | 'dishes',
  id: string,
): Promise<string | null> {
  const row = await db
    .prepare(`SELECT updated_at FROM ${table} WHERE id = ?`)
    .bind(id)
    .first<{ updated_at: string }>();

  return row?.updated_at ?? null;
}

// ─── Helpers ───

/** Fetches multiple ingredients by ID and returns them as a Map for fast lookup. */
async function fetchIngredientMap(
  db: D1Database,
  ids: string[],
): Promise<Map<string, Ingredient>> {
  const map = new Map<string, Ingredient>();
  if (ids.length === 0) return map;

  const placeholders = ids.map(() => '?').join(',');
  const { results } = await db
    .prepare(`SELECT * FROM ingredients WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all<IngredientRow>();

  for (const row of results) {
    map.set(row.id, ingredientFromRow(row));
  }

  return map;
}
