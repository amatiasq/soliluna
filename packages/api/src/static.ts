import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { serveStatic } from '@hono/node-server/serve-static';
import type { MiddlewareHandler } from 'hono';

/** Where the web build leaves its output. Overridable for the container. */
const WEB_DIST = resolve(process.env.WEB_DIST ?? join(import.meta.dirname, '../../web/dist'));

export function serveWebAssets(): MiddlewareHandler {
  return serveStatic({ root: WEB_DIST });
}

/** Last resort for any unmatched GET: the SPA shell. */
export async function serveAppShell(): Promise<Response> {
  const html = await readFile(join(WEB_DIST, 'index.html'), 'utf8');
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // The shell names the hashed bundles, so it must never be the stale copy.
      'Cache-Control': 'no-cache',
    },
  });
}
