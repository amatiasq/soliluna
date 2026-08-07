import { Hono } from 'hono';
import type { Env } from './types.ts';
import { basicAuthMiddleware } from './middleware/basic-auth.ts';
import ingredients from './routes/ingredients.ts';
import recipes from './routes/recipes.ts';
import dishes from './routes/dishes.ts';
import sync from './routes/sync.ts';
import data from './routes/data.ts';
import { serveAppShell, serveWebAssets } from './static.ts';

const app = new Hono<{ Bindings: Env }>();

// The whole origin, assets included: a 401 to a fetch() does not make the
// browser show the Basic auth prompt, so `/` has to be protected too or there
// is no way to authenticate. Exceptions in PUBLIC_PATHS.
app.use('*', basicAuthMiddleware);

app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.route('/api/ingredients', ingredients);
app.route('/api/recipes', recipes);
app.route('/api/dishes', dishes);
app.route('/api/sync', sync);
app.route('/api/data', data);

app.get('/api/events', (c) => {
  const clientId = c.req.query('clientId') || 'unknown';
  return c.env.SYNC_HUB.connect(clientId, c.req.raw.signal);
});

// The web build, with the shell as fallback so deep links reach the client router.
app.get('*', serveWebAssets());
app.get('*', () => serveAppShell());

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
