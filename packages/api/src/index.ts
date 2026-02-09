import { Hono } from 'hono';
import type { Env } from './types.js';
import { corsMiddleware } from './middleware/cors.js';
import ingredients from './routes/ingredients.js';
import recipes from './routes/recipes.js';
import dishes from './routes/dishes.js';
import sync from './routes/sync.js';
import data from './routes/data.js';

// Cloudflare requires the Durable Object class to be exported from the entry point
export { SyncHub } from './sync-hub.js';

const app = new Hono<{ Bindings: Env }>();

// ─── Global middleware ──────────────────────────────────────────────

app.use('*', corsMiddleware);

// ─── Health check ───────────────────────────────────────────────────

app.get('/api/health', (c) => c.json({ status: 'ok' }));

// ─── API routes ─────────────────────────────────────────────────────

app.route('/api/ingredients', ingredients);
app.route('/api/recipes', recipes);
app.route('/api/dishes', dishes);
app.route('/api/sync', sync);
app.route('/api/data', data);

// ─── SSE endpoint ────────────────────────────────────────────────────

app.get('/api/events', async (c) => {
  const clientId = c.req.query('clientId') || 'unknown';
  const id = c.env.SYNC_HUB.idFromName('global');
  const hub = c.env.SYNC_HUB.get(id);
  return hub.fetch(new Request(`http://internal/connect?clientId=${clientId}`));
});

// ─── Test-only endpoints (development only) ─────────────────────────

app.post('/api/__test/reset', async (c) => {
  if (c.env.ENVIRONMENT !== 'development') {
    return c.json({ error: 'Not available' }, 403);
  }

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

app.post('/api/__test/seed', async (c) => {
  if (c.env.ENVIRONMENT !== 'development') {
    return c.json({ error: 'Not available' }, 403);
  }

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

// ─── SPA fallback ───────────────────────────────────────────────────
// Serve index.html for any non-API route (client-side routing)

app.get('*', async (c) => {
  const url = new URL(c.req.url);
  url.pathname = '/index.html';
  return c.env.ASSETS.fetch(new Request(url));
});

// ─── Global error handler ───────────────────────────────────────────

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
