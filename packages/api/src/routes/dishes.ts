import { Hono } from 'hono';
import { DishCreateSchema, DishUpdateSchema } from '@soliluna/shared';
import type { Env } from '../types.js';
import {
  listDishes,
  getDish,
  createDish,
  updateDish,
  deleteDish,
  getUpdatedAt,
} from '../db/queries.js';
import { notifyChange } from '../notify.js';

const dishes = new Hono<{ Bindings: Env }>();

// GET /api/dishes — List all dishes with ingredients, recipes, and costs
// Order: null delivery_date first, then by date descending
dishes.get('/', async (c) => {
  const data = await listDishes(c.env.DB);
  return c.json({ data });
});

// POST /api/dishes — Create a new dish
dishes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = DishCreateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const data = await createDish(c.env.DB, parsed.data);

  const clientId = c.req.header('X-Client-Id');
  await notifyChange(c.env, 'dishes', data.id, 'create', clientId);

  return c.json({ data }, 201);
});

// GET /api/dishes/:id — Get one dish with everything
dishes.get('/:id', async (c) => {
  const data = await getDish(c.env.DB, c.req.param('id'));

  if (!data) {
    return c.json({ error: 'Dish not found' }, 404);
  }

  return c.json({ data });
});

// PUT /api/dishes/:id — Update metadata + replace ingredients + replace recipes
dishes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = DishUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const currentUpdatedAt = await getUpdatedAt(c.env.DB, 'dishes', id);

  if (!currentUpdatedAt) {
    return c.json({ error: 'Dish not found' }, 404);
  }

  if (currentUpdatedAt !== parsed.data.updatedAt) {
    const currentData = await getDish(c.env.DB, id);
    return c.json({ error: 'Conflict: record was modified', data: currentData }, 409);
  }

  const data = await updateDish(c.env.DB, id, parsed.data);

  const clientId = c.req.header('X-Client-Id');
  await notifyChange(c.env, 'dishes', id, 'update', clientId);

  return c.json({ data });
});

// DELETE /api/dishes/:id — Always succeeds
dishes.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const existing = await getDish(c.env.DB, id);
  if (!existing) {
    return c.json({ error: 'Dish not found' }, 404);
  }

  await deleteDish(c.env.DB, id);

  const clientId = c.req.header('X-Client-Id');
  await notifyChange(c.env, 'dishes', id, 'delete', clientId);

  return c.json({ data: { id } });
});

export default dishes;
