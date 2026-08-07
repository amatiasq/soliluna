import { Hono } from 'hono';
import type { Env } from '../types.ts';
import { getChangesSince } from '../db/queries.ts';

const sync = new Hono<{ Bindings: Env }>();

sync.get('/changes', async (c) => {
  const since = c.req.query('since');

  if (!since) {
    return c.json({ error: 'Missing required query parameter: since' }, 400);
  }

  const data = await getChangesSince(c.env.DB, since);
  return c.json({ data });
});

export default sync;
