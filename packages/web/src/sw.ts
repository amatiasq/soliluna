/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

// Hand-written (VitePWA injectManifest) because the generated worker served the
// precached shell before touching the network, so cancelling the Basic auth
// dialog still rendered the app. A navigation goes to the network FIRST here,
// and falls back to the shell only when the network is unreachable AND this
// browser was authorized before. The browser never shows its cached credentials
// to a worker, so that last part is a marker this file writes and deletes.

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

const AUTH_CACHE = 'soliluna-auth-v1';
const AUTH_MARKER = '/__authorized';

async function setAuthorized(authorized: boolean): Promise<void> {
  const cache = await caches.open(AUTH_CACHE);
  if (authorized) {
    await cache.put(AUTH_MARKER, new Response('1'));
  } else {
    await cache.delete(AUTH_MARKER);
  }
}

async function isAuthorized(): Promise<boolean> {
  const cache = await caches.open(AUTH_CACHE);
  return Boolean(await cache.match(AUTH_MARKER));
}

const appShell = createHandlerBoundToURL('/index.html');

const offlineResponse = (body: string, status: number) =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });

registerRoute(
  new NavigationRoute(
    async (options) => {
      try {
        const response = await fetch(options.request);

        if (response.status === 401 || response.status === 403) {
          // Straight to the browser, which shows the prompt. Never the cached
          // shell: that is the hole this file closes.
          await setAuthorized(false);
          return response;
        }

        if (response.ok) await setAuthorized(true);
        return response;
      } catch {
        // No network. Offline is only offered to a browser that got in before.
        if (await isAuthorized()) return appShell(options);
        return offlineResponse('Sin conexión y sin sesión iniciada.', 503);
      }
    },
    { denylist: [/^\/api\//] },
  ),
);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // The navigation that registered this worker wasn't controlled by it, so
      // without asking once here a browser that authenticated and went offline
      // straight away would be locked out until its second navigation.
      try {
        const response = await fetch('/index.html', { cache: 'no-store' });
        if (response.status === 401 || response.status === 403) {
          await setAuthorized(false);
        } else if (response.ok) {
          await setAuthorized(true);
        }
      } catch {
        // No network: leave whatever the marker already said.
      }
    })(),
  );
});
