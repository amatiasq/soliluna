import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './packages/web/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 2,
  workers: 1,

  use: {
    baseURL: 'http://localhost:5173',
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
      command: 'pnpm --filter @soliluna/api dev',
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
