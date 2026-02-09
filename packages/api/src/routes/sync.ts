import { Hono } from 'hono';
import type { Env } from '../types.js';
import { getChangesSince } from '../db/queries.js';

const sync = new Hono<{ Bindings: Env }>();

// GET /api/sync/changes?since=<ISO timestamp>
// Returns all entities modified after the given timestamp, plus deletions.
sync.get('/changes', async (c) => {
  const since = c.req.query('since');

  if (!since) {
    return c.json({ error: 'Missing required query parameter: since' }, 400);
  }

  const data = await getChangesSince(c.env.DB, since);
  return c.json({ data });
});

export default sync;
