import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './packages/web/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 2,
  workers: 1,

  use: {
    baseURL: 'http://localhost:5173',
    // The API is behind Basic auth. src/dev.ts falls back to these credentials
    // when .dev.vars sets none. `send: 'always'` avoids depending on the 401
    // challenge surviving the Vite dev proxy.
    httpCredentials: { username: 'dev', password: 'dev', send: 'always' },
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: [
    {
      // dev:once, not dev: `node --watch` would restart the API mid-suite.
      command: 'pnpm --filter @soliluna/api dev:once',
      port: 8787,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter @soliluna/web dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
