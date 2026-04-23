import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import type { Env } from '../types.js';

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const token = getCookie(c, 'soliluna_session');
  if (!token) {
    return c.json({ error: 'No autenticado' }, 401);
  }

  try {
    await verify(token, c.env.AUTH_SECRET, 'HS256');
  } catch {
    return c.json({ error: 'Sesión expirada' }, 401);
  }

  await next();
});
