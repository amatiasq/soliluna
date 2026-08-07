import { Hono } from 'hono';
import { IngredientCreateSchema, IngredientUpdateSchema } from '@soliluna/shared';
import type { Env } from '../types.ts';
import {
  listIngredients,
  getIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getUpdatedAt,
} from '../db/queries.ts';
import { notifyChange } from '../notify.ts';

const ingredients = new Hono<{ Bindings: Env }>();

ingredients.get('/', async (c) => {
  const data = await listIngredients(c.env.DB);
  return c.json({ data });
});

ingredients.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = IngredientCreateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const data = await createIngredient(c.env.DB, parsed.data);

  const clientId = c.req.header('X-Client-Id');
  notifyChange(c.env, 'ingredients', data.id, 'create', clientId);

  return c.json({ data }, 201);
});

ingredients.get('/:id', async (c) => {
  const data = await getIngredient(c.env.DB, c.req.param('id'));

  if (!data) {
    return c.json({ error: 'Ingredient not found' }, 404);
  }

  return c.json({ data });
});

ingredients.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = IngredientUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const currentUpdatedAt = await getUpdatedAt(c.env.DB, 'ingredients', id);

  if (!currentUpdatedAt) {
    return c.json({ error: 'Ingredient not found' }, 404);
  }

  // Reject if the row changed since the client read it.
  if (currentUpdatedAt !== parsed.data.updatedAt) {
    const currentData = await getIngredient(c.env.DB, id);
    return c.json({ error: 'Conflict: record was modified', data: currentData }, 409);
  }

  const data = await updateIngredient(c.env.DB, id, parsed.data);

  const clientId = c.req.header('X-Client-Id');
  notifyChange(c.env, 'ingredients', id, 'update', clientId);

  return c.json({ data });
});

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
  notifyChange(c.env, 'ingredients', id, 'delete', clientId);

  return c.json({ data: { id } });
});

export default ingredients;
