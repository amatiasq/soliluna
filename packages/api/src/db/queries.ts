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
      cost: -1,
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

// ═══════════════════════════════════════════════════════════════════
// INGREDIENTS
// ═══════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════
// RECIPES
// ═══════════════════════════════════════════════════════════════════

/** Builds a full Recipe object (with resolved ingredients and cost) from a recipe row. */
async function buildRecipeWithIngredients(
  db: D1Database,
  row: RecipeRow,
): Promise<Recipe> {
  const metadata = recipeMetadataFromRow(row);

  const { results: riRows } = await db
    .prepare('SELECT * FROM recipe_ingredients WHERE recipe_id = ?')
    .bind(row.id)
    .all<RecipeIngredientRow>();

  const ingredientIds = riRows.map((ri) => ri.ingredient_id);
  const ingredientMap = await fetchIngredientMap(db, ingredientIds);

  const ingredients: IngredientUsageResolved[] = riRows.map((ri) =>
    resolveIngredientUsageCost(ri, ingredientMap),
  );

  const cost = ingredients.reduce((sum, ing) => sum + (ing.cost >= 0 ? ing.cost : 0), 0);

  return { ...metadata, ingredients, cost };
}

export async function listRecipes(db: D1Database): Promise<Recipe[]> {
  const { results: rows } = await db
    .prepare('SELECT * FROM recipes ORDER BY name')
    .all<RecipeRow>();

  return Promise.all(rows.map((row) => buildRecipeWithIngredients(db, row)));
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

// ═══════════════════════════════════════════════════════════════════
// DISHES
// ═══════════════════════════════════════════════════════════════════

/** Builds a full Dish object (with resolved ingredients, recipes, and costs). */
async function buildDishWithRelations(
  db: D1Database,
  row: DishRow,
): Promise<Dish> {
  const metadata = dishMetadataFromRow(row);

  // Fetch direct ingredient associations
  const { results: diRows } = await db
    .prepare('SELECT * FROM dish_ingredients WHERE dish_id = ?')
    .bind(row.id)
    .all<DishIngredientRow>();

  // Fetch recipe associations
  const { results: drRows } = await db
    .prepare('SELECT * FROM dish_recipes WHERE dish_id = ?')
    .bind(row.id)
    .all<DishRecipeRow>();

  // Resolve direct ingredient costs
  const ingredientIds = diRows.map((di) => di.ingredient_id);
  const ingredientMap = await fetchIngredientMap(db, ingredientIds);

  const ingredients: IngredientUsageResolved[] = diRows.map((di) =>
    resolveIngredientUsageCost(di, ingredientMap),
  );

  // Resolve recipe costs
  const recipes: RecipeUsageResolved[] = await Promise.all(
    drRows.map(async (dr) => {
      const recipe = await getRecipe(db, dr.recipe_id);

      if (!recipe) {
        return {
          recipeId: dr.recipe_id,
          amount: dr.amount,
          unit: dr.unit as RecipeUnit,
          name: '(desconocido)',
          cost: -1,
        };
      }

      const cost = calculateRecipeCost(recipe, dr.amount);

      return {
        recipeId: dr.recipe_id,
        amount: dr.amount,
        unit: dr.unit as RecipeUnit,
        name: recipe.name,
        cost,
      };
    }),
  );

  const ingredientsCost = ingredients.reduce(
    (sum, ing) => sum + (ing.cost >= 0 ? ing.cost : 0),
    0,
  );

  const recipesCost = recipes.reduce(
    (sum, rec) => sum + (rec.cost >= 0 ? rec.cost : 0),
    0,
  );

  const baseCost = ingredientsCost + recipesCost;
  const finalPrice = baseCost * metadata.multiplier;

  return {
    ...metadata,
    ingredients,
    recipes,
    baseCost,
    finalPrice,
  };
}

export async function listDishes(db: D1Database): Promise<Dish[]> {
  // Batch: fetch all dishes + all join tables + all recipes + all ingredients in 5 queries
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
  const allDI = drResult.results as unknown as DishRecipeRow[];
  const allDIng = diResult.results as unknown as DishIngredientRow[];
  const recipeRows = recipeResult.results as unknown as RecipeRow[];
  const allRI = riResult.results as unknown as RecipeIngredientRow[];
  const ingredientRows = ingredientResult.results as unknown as IngredientRow[];

  // Build lookup maps
  const ingredientMap = new Map<string, Ingredient>();
  for (const row of ingredientRows) {
    ingredientMap.set(row.id, ingredientFromRow(row));
  }

  // Group recipe_ingredients by recipe_id
  const riByRecipe = new Map<string, RecipeIngredientRow[]>();
  for (const ri of allRI) {
    const arr = riByRecipe.get(ri.recipe_id);
    if (arr) arr.push(ri);
    else riByRecipe.set(ri.recipe_id, [ri]);
  }

  // Build recipe map (with resolved ingredients and cost)
  const recipeMap = new Map<string, Recipe>();
  for (const row of recipeRows) {
    const metadata = recipeMetadataFromRow(row);
    const riRows = riByRecipe.get(row.id) ?? [];
    const ingredients: IngredientUsageResolved[] = riRows.map((ri) =>
      resolveIngredientUsageCost(ri, ingredientMap),
    );
    const cost = ingredients.reduce((sum, ing) => sum + (ing.cost >= 0 ? ing.cost : 0), 0);
    recipeMap.set(row.id, { ...metadata, ingredients, cost });
  }

  // Group dish_ingredients and dish_recipes by dish_id
  const dIngByDish = new Map<string, DishIngredientRow[]>();
  for (const di of allDIng) {
    const arr = dIngByDish.get(di.dish_id);
    if (arr) arr.push(di);
    else dIngByDish.set(di.dish_id, [di]);
  }

  const dRecByDish = new Map<string, DishRecipeRow[]>();
  for (const dr of allDI) {
    const arr = dRecByDish.get(dr.dish_id);
    if (arr) arr.push(dr);
    else dRecByDish.set(dr.dish_id, [dr]);
  }

  // Assemble dishes
  return dishRows.map((row) => {
    const metadata = dishMetadataFromRow(row);
    const diRows = dIngByDish.get(row.id) ?? [];
    const drRows = dRecByDish.get(row.id) ?? [];

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
      const cost = calculateRecipeCost(recipe, dr.amount);
      return {
        recipeId: dr.recipe_id,
        amount: dr.amount,
        unit: dr.unit as RecipeUnit,
        name: recipe.name,
        cost,
      };
    });

    const ingredientsCost = ingredients.reduce(
      (sum, ing) => sum + (ing.cost >= 0 ? ing.cost : 0),
      0,
    );
    const recipesCost = recipes.reduce(
      (sum, rec) => sum + (rec.cost >= 0 ? rec.cost : 0),
      0,
    );
    const baseCost = ingredientsCost + recipesCost;
    const finalPrice = baseCost * metadata.multiplier;

    return { ...metadata, ingredients, recipes, baseCost, finalPrice };
  });
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

// ═══════════════════════════════════════════════════════════════════
// SYNC
// ═══════════════════════════════════════════════════════════════════

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
  // Fetch all entities modified since the timestamp
  const [ingredientRows, recipeRows, dishRows, deletionRows] = await db.batch([
    db.prepare('SELECT * FROM ingredients WHERE updated_at > ? ORDER BY name').bind(since),
    db.prepare('SELECT * FROM recipes WHERE updated_at > ? ORDER BY name').bind(since),
    db.prepare('SELECT * FROM dishes WHERE updated_at > ? ORDER BY name').bind(since),
    db.prepare('SELECT * FROM deletions WHERE deleted_at > ?').bind(since),
  ]);

  const ingredients = (ingredientRows.results as unknown as IngredientRow[]).map(ingredientFromRow);

  // Build full recipe and dish objects with resolved relations
  const recipes = await Promise.all(
    (recipeRows.results as unknown as RecipeRow[]).map((row) =>
      buildRecipeWithIngredients(db, row),
    ),
  );

  const dishes = await Promise.all(
    (dishRows.results as unknown as DishRow[]).map((row) =>
      buildDishWithRelations(db, row),
    ),
  );

  const deletions = (deletionRows.results as unknown as DeletionRow[]).map((row) => ({
    entity: row.entity,
    entityId: row.entity_id,
    deletedAt: row.deleted_at,
  }));

  return { ingredients, recipes, dishes, deletions };
}

// ═══════════════════════════════════════════════════════════════════
// CONFLICT DETECTION
// ═══════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

/** Fetches multiple ingredients by ID and returns them as a Map for fast lookup. */
async function fetchIngredientMap(
  db: D1Database,
  ids: string[],
): Promise<Map<string, Ingredient>> {
  const map = new Map<string, Ingredient>();
  if (ids.length === 0) return map;

  // Fetch all ingredients at once using IN clause
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
