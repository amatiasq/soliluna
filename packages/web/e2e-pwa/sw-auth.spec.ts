import { test, expect, chromium } from '@playwright/test';

// The Basic auth gate lives in the service worker as much as in the API, and
// only the built bundle has one: this suite talks to the app process serving
// packages/web/dist (see playwright.pwa.config.ts). The hole it guards: the
// workbox worker served the precached shell before touching the network, so
// cancelling the auth dialog still rendered the whole app from cache.

const BASE = 'http://localhost:8790';
const CREDS = { username: 'dev', password: 'dev', send: 'always' as const };

async function waitForServiceWorker(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: 15000,
  });
}

test('sin credenciales la app no carga', async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const response = await page.goto(`${BASE}/ingredients`);

  expect(response?.status()).toBe(401);
  expect(await page.locator('#root').count()).toBe(0);

  await browser.close();
});

test('con credenciales la app carga y sigue cargando offline', async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ httpCredentials: CREDS });
  const page = await context.newPage();
  await page.route('**/api/events*', (route) => route.abort());

  await page.goto(`${BASE}/ingredients`);
  await expect(page.locator('#root')).toBeVisible();
  await waitForServiceWorker(page);

  // Authorized browser without network: the cached shell is served
  await context.setOffline(true);
  await page.goto(`${BASE}/ingredients`);
  await expect(page.locator('#root')).toBeVisible();
  expect(await page.locator('body').innerText()).not.toContain('Sin conexión y sin sesión');

  await browser.close();
});

test('un 401 no sirve la app cacheada, aunque el SW esté instalado', async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ httpCredentials: CREDS });
  const page = await context.newPage();
  await page.route('**/api/events*', (route) => route.abort());

  await page.goto(`${BASE}/ingredients`);
  await expect(page.locator('#root')).toBeVisible();
  await waitForServiceWorker(page);

  // What the browser sees when the dialog is cancelled or the password changes
  await context.route('**/ingredients', (route) =>
    route.fulfill({ status: 401, body: 'Authentication required.' }),
  );

  const response = await page.goto(`${BASE}/ingredients`);

  expect(response?.status()).toBe(401);
  expect(await page.locator('body').innerText()).toContain('Authentication required.');
  expect(await page.locator('#root').count()).toBe(0);

  await browser.close();
});

test('un navegador que nunca se autenticó no arranca offline', async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE}/`); // 401: no service worker gets registered
  await context.setOffline(true);
  const error = await page.goto(`${BASE}/ingredients`).catch((err: Error) => err);

  expect(error).toBeInstanceOf(Error);
  expect(String(error)).toContain('ERR_INTERNET_DISCONNECTED');

  await browser.close();
});
