import { createMiddleware } from 'hono/factory';
import { timingSafeEqual } from 'hono/utils/buffer';
import type { Env } from '../types.ts';

// Basic auth for the whole origin, app included: a 401 to a fetch() does not
// make the browser show its prompt. Ported from conta/api/auth.ts, but with a
// constant-time comparison, which that one does not have.

const REALM = 'Basic realm="soliluna", charset="UTF-8"';

/** Paths served without credentials. Only monitoring. */
const PUBLIC_PATHS = new Set(['/api/health']);

function loadUsers(raw: string | undefined): Map<string, string> {
  const users = new Map<string, string>();
  for (const pair of (raw ?? '').split(',')) {
    const i = pair.indexOf(':');
    if (i <= 0) continue;
    const user = pair.slice(0, i).trim();
    const pass = pair.slice(i + 1); // password may contain ':'
    if (user) users.set(user, pass);
  }
  return users;
}

/** Decodes the base64 of an `Authorization: Basic` header as UTF-8. */
function decodeCredentials(encoded: string): string | null {
  try {
    const bytes = Uint8Array.from(atob(encoded), (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** Compares against every user without short-circuiting, in constant time. */
async function isAuthorized(
  users: Map<string, string>,
  user: string,
  pass: string,
): Promise<boolean> {
  let authorized = false;
  for (const [knownUser, knownPass] of users) {
    const [userMatches, passMatches] = await Promise.all([
      timingSafeEqual(knownUser, user),
      timingSafeEqual(knownPass, pass),
    ]);
    if (userMatches && passMatches) authorized = true;
  }
  return authorized;
}

export const basicAuthMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  if (PUBLIC_PATHS.has(c.req.path)) return next();

  const users = loadUsers(c.env.SOLILUNA_AUTH);
  if (users.size === 0) {
    // Fail closed: refuse to serve rather than expose the data unprotected.
    return c.text('SOLILUNA_AUTH is not configured; refusing to serve without auth.', 503);
  }

  const match = /^Basic\s+(.+)$/i.exec(c.req.header('Authorization') ?? '');
  const decoded = match && decodeCredentials(match[1]);
  if (!decoded) {
    return c.text('Authentication required.', 401, { 'WWW-Authenticate': REALM });
  }

  const i = decoded.indexOf(':');
  const user = i >= 0 ? decoded.slice(0, i) : decoded;
  const pass = i >= 0 ? decoded.slice(i + 1) : '';

  if (!(await isAuthorized(users, user, pass))) {
    return c.text('Invalid credentials.', 401, { 'WWW-Authenticate': REALM });
  }

  await next();
});
