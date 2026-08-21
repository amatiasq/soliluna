import { defineConfig, devices } from '@playwright/test';

// The service worker suite, apart from playwright.config.ts because it needs
// a different server: the built bundle served by the app process with Basic
// auth on — the Vite dev server registers no service worker at all. The API
// entry is src/dev.ts, which falls back to dev:dev credentials.

export default defineConfig({
  testDir: './packages/web/e2e-pwa',
  timeout: 60_000,
  retries: 0,
  workers: 1,

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    // Its own database file, so a run here does not wipe the one `pnpm dev` uses.
    command:
      'pnpm --filter @soliluna/web build && cd packages/api && PORT=8790 DB_PATH=pwa.db node src/dev.ts',
    port: 8790,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
