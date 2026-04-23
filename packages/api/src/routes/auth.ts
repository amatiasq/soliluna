import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import type { Env } from '../types.js';
import { GOOGLE_CLIENT_ID, ALLOWED_EMAILS } from '../auth/config.js';

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

const auth = new Hono<{ Bindings: Env }>();

// Public: returns the Google Client ID for the frontend
auth.get('/config', (c) => {
  return c.json({ data: { clientId: GOOGLE_CLIENT_ID } });
});

// Login: verify Google ID token, check allowed list, create session
auth.post('/login', async (c) => {
  const { credential } = await c.req.json<{ credential: string }>();

  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
  );
  if (!res.ok) {
    return c.json({ error: 'Token inválido' }, 401);
  }

  const tokenInfo = (await res.json()) as {
    aud: string;
    email: string;
    email_verified: string;
  };

  if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
    return c.json({ error: 'Token inválido' }, 401);
  }

  if (!ALLOWED_EMAILS.includes(tokenInfo.email)) {
    return c.json({ error: 'No autorizado' }, 403);
  }

  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const token = await sign({ email: tokenInfo.email, exp }, c.env.AUTH_SECRET);

  const isSecure = new URL(c.req.url).protocol === 'https:';
  setCookie(c, 'soliluna_session', token, {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'Lax',
    maxAge: SESSION_MAX_AGE,
  });

  return c.json({ data: { email: tokenInfo.email } });
});

// Check current session
auth.get('/me', async (c) => {
  const token = getCookie(c, 'soliluna_session');
  if (!token) {
    return c.json({ data: null });
  }

  try {
    const payload = await verify(token, c.env.AUTH_SECRET, 'HS256');
    return c.json({ data: { email: payload.email as string } });
  } catch {
    return c.json({ data: null });
  }
});

// Logout: clear session cookie
auth.post('/logout', (c) => {
  deleteCookie(c, 'soliluna_session', { path: '/' });
  return c.json({ data: { message: 'Sesión cerrada' } });
});

export default auth;
