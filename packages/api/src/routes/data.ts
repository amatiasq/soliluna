import { Hono } from 'hono';
import type { Env } from '../types.js';

const data = new Hono<{ Bindings: Env }>();

// GET /api/data/export — Export all data as a single JSON object
data.get('/export', async (c) => {
  const [ingredients, recipes, recipeIngredients, dishes, dishIngredients, dishRecipes] =
    await c.env.DB.batch([
      c.env.DB.prepare('SELECT * FROM ingredients ORDER BY name'),
      c.env.DB.prepare('SELECT * FROM recipes ORDER BY name'),
      c.env.DB.prepare('SELECT * FROM recipe_ingredients'),
      c.env.DB.prepare('SELECT * FROM dishes ORDER BY name'),
      c.env.DB.prepare('SELECT * FROM dish_ingredients'),
      c.env.DB.prepare('SELECT * FROM dish_recipes'),
    ]);

  return c.json({
    data: {
      version: 1,
      exportedAt: new Date().toISOString(),
      ingredients: ingredients.results,
      recipes: recipes.results,
      recipeIngredients: recipeIngredients.results,
      dishes: dishes.results,
      dishIngredients: dishIngredients.results,
      dishRecipes: dishRecipes.results,
    },
  });
});

// POST /api/data/import — Import data from an export JSON.
// Replaces all existing data (destructive).
data.post('/import', async (c) => {
  const body = await c.req.json();
  const payload = body as {
    version: number;
    ingredients: Array<Record<string, unknown>>;
    recipes: Array<Record<string, unknown>>;
    recipeIngredients: Array<Record<string, unknown>>;
    dishes: Array<Record<string, unknown>>;
    dishIngredients: Array<Record<string, unknown>>;
    dishRecipes: Array<Record<string, unknown>>;
  };

  if (payload.version !== 1) {
    return c.json({ error: 'Unsupported export version' }, 400);
  }

  // Clear all data
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM dish_recipes'),
    c.env.DB.prepare('DELETE FROM dish_ingredients'),
    c.env.DB.prepare('DELETE FROM dishes'),
    c.env.DB.prepare('DELETE FROM recipe_ingredients'),
    c.env.DB.prepare('DELETE FROM recipes'),
    c.env.DB.prepare('DELETE FROM ingredients'),
    c.env.DB.prepare('DELETE FROM deletions'),
  ]);

  // Insert ingredients
  for (const row of payload.ingredients) {
    await c.env.DB.prepare(
      `INSERT INTO ingredients (id, name, pkg_size, pkg_unit, pkg_price, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(row.id, row.name, row.pkg_size, row.pkg_unit, row.pkg_price, row.created_at, row.updated_at)
      .run();
  }

  // Insert recipes
  for (const row of payload.recipes) {
    await c.env.DB.prepare(
      `INSERT INTO recipes (id, name, yield_amount, yield_unit, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(row.id, row.name, row.yield_amount, row.yield_unit, row.created_at, row.updated_at)
      .run();
  }

  // Insert recipe_ingredients
  for (const row of payload.recipeIngredients) {
    await c.env.DB.prepare(
      `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)`,
    )
      .bind(row.recipe_id, row.ingredient_id, row.amount, row.unit)
      .run();
  }

  // Insert dishes
  for (const row of payload.dishes) {
    await c.env.DB.prepare(
      `INSERT INTO dishes (id, name, pax, delivery_date, notes, multiplier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(row.id, row.name, row.pax, row.delivery_date, row.notes, row.multiplier, row.created_at, row.updated_at)
      .run();
  }

  // Insert dish_ingredients
  for (const row of payload.dishIngredients) {
    await c.env.DB.prepare(
      `INSERT INTO dish_ingredients (dish_id, ingredient_id, amount, unit) VALUES (?, ?, ?, ?)`,
    )
      .bind(row.dish_id, row.ingredient_id, row.amount, row.unit)
      .run();
  }

  // Insert dish_recipes
  for (const row of payload.dishRecipes) {
    await c.env.DB.prepare(
      `INSERT INTO dish_recipes (dish_id, recipe_id, amount, unit) VALUES (?, ?, ?, ?)`,
    )
      .bind(row.dish_id, row.recipe_id, row.amount, row.unit)
      .run();
  }

  return c.json({ data: { message: 'Import complete' } });
});

// POST /api/data/migrate-v2 — Import data from Firebase v2 export format.
// Expects the JSON from v2's /export page: { cakes, recipes, ingredients }
// Converts: euros → cents, field names, denormalized → junction tables.
data.post('/migrate-v2', async (c) => {
  const body = await c.req.json();
  const v2 = body as {
    ingredients: Array<{
      id: string;
      name: string;
      pkgSize: number;
      pkgUnit: string;
      pkgPrice: number; // euros (decimal)
    }>;
    recipes: Array<{
      id: string;
      name: string;
      amount: number; // yield amount
      unit: string; // yield unit
      cost: number;
      ingredients: Array<{
        id: string;
        name: string;
        amount: number;
        unit: string;
        cost: number;
      }>;
    }>;
    cakes: Array<{
      id: string;
      name: string;
      pax: number;
      date?: { seconds: number; nanoseconds: number } | null; // Firebase Timestamp
      notes?: string;
      cost: number;
      multiplier: number;
      recipes: Array<{
        id: string;
        name: string;
        amount: number;
        unit: string;
        cost: number;
      }>;
      ingredients: Array<{
        id: string;
        name: string;
        amount: number;
        unit: string;
        cost: number;
      }>;
    }>;
  };

  if (!v2.ingredients || !v2.recipes || !v2.cakes) {
    return c.json({ error: 'Expected { cakes, recipes, ingredients } from v2 export' }, 400);
  }

  const now = new Date().toISOString();
  const skipped: string[] = [];

  // Helper: convert euros to cents (integer)
  const eurosToCents = (euros: number): number => Math.round(Number(euros) * 100);

  // Helper: coerce string amounts to numbers (v2 has some amounts as strings)
  const toNumber = (value: unknown): number => {
    const n = Number(value);
    return isNaN(n) ? 0 : n;
  };

  // Helper: convert Firebase Timestamp to ISO date string (YYYY-MM-DD)
  const timestampToDate = (ts?: { seconds: number } | null): string | null => {
    if (!ts || !ts.seconds) return null;
    return new Date(ts.seconds * 1000).toISOString().split('T')[0];
  };

  // Collect all prepared statements, then execute in batches of 400
  // (D1 limits to ~500 statements per batch call)
  const statements: D1PreparedStatement[] = [];

  // Clear all data
  statements.push(
    c.env.DB.prepare('DELETE FROM dish_recipes'),
    c.env.DB.prepare('DELETE FROM dish_ingredients'),
    c.env.DB.prepare('DELETE FROM dishes'),
    c.env.DB.prepare('DELETE FROM recipe_ingredients'),
    c.env.DB.prepare('DELETE FROM recipes'),
    c.env.DB.prepare('DELETE FROM ingredients'),
    c.env.DB.prepare('DELETE FROM deletions'),
  );

  // Sets of IDs that will be inserted (for reference checking)
  const ingredientIds = new Set<string>();
  const recipeIds = new Set<string>();

  // 1. Prepare ingredient inserts (pkgPrice: euros → cents)
  for (const ing of v2.ingredients) {
    if (!ing.name) {
      skipped.push(`ingredient id=${ing.id}: missing name, skipping`);
      continue;
    }
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO ingredients (id, name, pkg_size, pkg_unit, pkg_price, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        ing.id,
        ing.name,
        toNumber(ing.pkgSize) || 1,
        ing.pkgUnit || 'u',
        eurosToCents(ing.pkgPrice || 0),
        now,
        now,
      ),
    );
    ingredientIds.add(ing.id);
  }

  // 2. Prepare recipe inserts (amount/unit → yield_amount/yield_unit)
  for (const rec of v2.recipes) {
    if (!rec.name) {
      skipped.push(`recipe id=${rec.id}: missing name, skipping`);
      continue;
    }
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO recipes (id, name, yield_amount, yield_unit, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(rec.id, rec.name, toNumber(rec.amount) || 1, rec.unit || 'PAX', now, now),
    );
    recipeIds.add(rec.id);

    // Prepare recipe ingredient inserts from the embedded array
    for (const usage of rec.ingredients) {
      const amount = toNumber(usage.amount);
      if (amount <= 0) {
        skipped.push(`recipe "${rec.name}": ingredient "${usage.name}" amount=${String(usage.amount)}`);
        continue;
      }
      if (!ingredientIds.has(usage.id)) {
        skipped.push(`recipe "${rec.name}": ingredient "${usage.name}" not found (id=${usage.id})`);
        continue;
      }
      statements.push(
        c.env.DB.prepare(
          `INSERT OR IGNORE INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit)
           VALUES (?, ?, ?, ?)`,
        ).bind(rec.id, usage.id, amount, usage.unit || 'g'),
      );
    }
  }

  // 3. Prepare dish inserts (cakes → dishes, date → delivery_date)
  for (const cake of v2.cakes) {
    const deliveryDate = timestampToDate(cake.date);

    statements.push(
      c.env.DB.prepare(
        `INSERT INTO dishes (id, name, pax, delivery_date, notes, multiplier, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        cake.id,
        cake.name || 'Sin nombre',
        cake.pax || 1,
        deliveryDate,
        cake.notes ?? '',
        cake.multiplier || 1,
        now,
        now,
      ),
    );

    // Prepare dish ingredient inserts from the embedded array
    for (const usage of cake.ingredients) {
      const amount = toNumber(usage.amount);
      if (amount <= 0 || !ingredientIds.has(usage.id)) continue;
      statements.push(
        c.env.DB.prepare(
          `INSERT OR IGNORE INTO dish_ingredients (dish_id, ingredient_id, amount, unit)
           VALUES (?, ?, ?, ?)`,
        ).bind(cake.id, usage.id, amount, usage.unit || 'g'),
      );
    }

    // Prepare dish recipe inserts from the embedded array
    for (const usage of cake.recipes) {
      const amount = toNumber(usage.amount);
      if (amount <= 0 || !recipeIds.has(usage.id)) continue;
      statements.push(
        c.env.DB.prepare(
          `INSERT OR IGNORE INTO dish_recipes (dish_id, recipe_id, amount, unit)
           VALUES (?, ?, ?, ?)`,
        ).bind(cake.id, usage.id, amount, usage.unit || 'PAX'),
      );
    }
  }

  // Execute all statements in batches of 400
  const BATCH_SIZE = 400;
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const batch = statements.slice(i, i + BATCH_SIZE);
    await c.env.DB.batch(batch);
  }

  return c.json({
    data: {
      message: 'Migration from v2 complete',
      totalStatements: statements.length,
      counts: {
        ingredients: ingredientIds.size,
        recipes: recipeIds.size,
        dishes: v2.cakes.length,
      },
      skipped,
    },
  });
});

export default data;
