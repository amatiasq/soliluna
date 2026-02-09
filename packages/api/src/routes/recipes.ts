import { Hono } from 'hono';
import { RecipeCreateSchema, RecipeUpdateSchema } from '@soliluna/shared';
import type { Env } from '../types.js';
import {
  listRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getUpdatedAt,
} from '../db/queries.js';
import { notifyChange } from '../notify.js';

const recipes = new Hono<{ Bindings: Env }>();

// GET /api/recipes — List all recipes with ingredients and costs
recipes.get('/', async (c) => {
  const data = await listRecipes(c.env.DB);
  return c.json({ data });
});

// POST /api/recipes — Create a new recipe (metadata only, no ingredients yet)
recipes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = RecipeCreateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const data = await createRecipe(c.env.DB, parsed.data);

  const clientId = c.req.header('X-Client-Id');
  await notifyChange(c.env, 'recipes', data.id, 'create', clientId);

  return c.json({ data }, 201);
});

// GET /api/recipes/:id — Get one recipe with ingredients and costs
recipes.get('/:id', async (c) => {
  const data = await getRecipe(c.env.DB, c.req.param('id'));

  if (!data) {
    return c.json({ error: 'Recipe not found' }, 404);
  }

  return c.json({ data });
});

// PUT /api/recipes/:id — Update metadata + replace ingredient list
recipes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = RecipeUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const currentUpdatedAt = await getUpdatedAt(c.env.DB, 'recipes', id);

  if (!currentUpdatedAt) {
    return c.json({ error: 'Recipe not found' }, 404);
  }

  if (currentUpdatedAt !== parsed.data.updatedAt) {
    const currentData = await getRecipe(c.env.DB, id);
    return c.json({ error: 'Conflict: record was modified', data: currentData }, 409);
  }

  const data = await updateRecipe(c.env.DB, id, parsed.data);

  const clientId = c.req.header('X-Client-Id');
  await notifyChange(c.env, 'recipes', id, 'update', clientId);

  return c.json({ data });
});

// DELETE /api/recipes/:id — Delete a recipe (fails if used in dishes)
recipes.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const existing = await getRecipe(c.env.DB, id);
  if (!existing) {
    return c.json({ error: 'Recipe not found' }, 404);
  }

  const result = await deleteRecipe(c.env.DB, id);

  if (result) {
    return c.json({ error: result.error }, 409);
  }

  const clientId = c.req.header('X-Client-Id');
  await notifyChange(c.env, 'recipes', id, 'delete', clientId);

  return c.json({ data: { id } });
});

export default recipes;
