import { Hono } from 'hono';
import { IngredientCreateSchema, IngredientUpdateSchema } from '@soliluna/shared';
import type { Env } from '../types.js';
import {
  listIngredients,
  getIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getUpdatedAt,
} from '../db/queries.js';
import { notifyChange } from '../notify.js';

const ingredients = new Hono<{ Bindings: Env }>();

// GET /api/ingredients — List all ingredients, ordered by name
ingredients.get('/', async (c) => {
  const data = await listIngredients(c.env.DB);
  return c.json({ data });
});

// POST /api/ingredients — Create a new ingredient
ingredients.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = IngredientCreateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const data = await createIngredient(c.env.DB, parsed.data);

  const clientId = c.req.header('X-Client-Id');
  await notifyChange(c.env, 'ingredients', data.id, 'create', clientId);

  return c.json({ data }, 201);
});

// GET /api/ingredients/:id — Get one ingredient
ingredients.get('/:id', async (c) => {
  const data = await getIngredient(c.env.DB, c.req.param('id'));

  if (!data) {
    return c.json({ error: 'Ingredient not found' }, 404);
  }

  return c.json({ data });
});

// PUT /api/ingredients/:id — Update an ingredient (with conflict detection)
ingredients.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = IngredientUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  // Check that the record exists
  const currentUpdatedAt = await getUpdatedAt(c.env.DB, 'ingredients', id);

  if (!currentUpdatedAt) {
    return c.json({ error: 'Ingredient not found' }, 404);
  }

  // Conflict detection: reject if the record was modified since the client last read it
  if (currentUpdatedAt !== parsed.data.updatedAt) {
    const currentData = await getIngredient(c.env.DB, id);
    return c.json({ error: 'Conflict: record was modified', data: currentData }, 409);
  }

  const data = await updateIngredient(c.env.DB, id, parsed.data);

  const clientId = c.req.header('X-Client-Id');
  await notifyChange(c.env, 'ingredients', id, 'update', clientId);

  return c.json({ data });
});

// DELETE /api/ingredients/:id — Delete an ingredient (fails if used)
ingredients.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const existing = await getIngredient(c.env.DB, id);
  if (!existing) {
    return c.json({ error: 'Ingredient not found' }, 404);
  }

  const result = await deleteIngredient(c.env.DB, id);

  if (result) {
    return c.json({ error: result.error }, 409);
  }

  const clientId = c.req.header('X-Client-Id');
  await notifyChange(c.env, 'ingredients', id, 'delete', clientId);

  return c.json({ data: { id } });
});

export default ingredients;
