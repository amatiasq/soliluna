import { Hono } from 'hono';
import type { Env } from '../types.ts';

// Wipes every table and runs arbitrary SQL. Mounted only by src/dev.ts, so it
// does not exist in the deployed bundle.

const app = new Hono<{ Bindings: Env }>();

app.post('/reset', async (c) => {
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM dish_recipes'),
    c.env.DB.prepare('DELETE FROM dish_ingredients'),
    c.env.DB.prepare('DELETE FROM dishes'),
    c.env.DB.prepare('DELETE FROM recipe_ingredients'),
    c.env.DB.prepare('DELETE FROM recipes'),
    c.env.DB.prepare('DELETE FROM ingredients'),
    c.env.DB.prepare('DELETE FROM deletions'),
  ]);

  return c.json({ data: { message: 'All tables cleared' } });
});

app.post('/seed', async (c) => {
  const sql = await c.req.text();
  if (sql.trim()) {
    const statements = sql
      .split(';')
      .map((s) =>
        s
          .split('\n')
          .filter((line) => !line.trimStart().startsWith('--'))
          .join('\n')
          .trim(),
      )
      .filter((s) => s.length > 0);
    await c.env.DB.batch(statements.map((s) => c.env.DB.prepare(s)));
  }

  return c.json({ data: { message: 'Seed complete' } });
});

export default app;
