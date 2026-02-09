import { test, expect } from '@playwright/test';
import { seedDB } from './helpers/db';

test.describe('Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/events*', (route) => route.abort());
    await seedDB();
  });

  test('GET /api/dishes responde en menos de 2 segundos', async ({ page }) => {
    // Direct API call to measure response time, bypassing SPA overhead
    const start = Date.now();
    const response = await page.request.get('http://localhost:8787/api/dishes');
    const elapsed = Date.now() - start;

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(2000);
  });

  test('peticiones GET concurrentes al mismo endpoint se deduplican', async ({ page }) => {
    // Slow down /api/dishes to create a window where both requests overlap
    let dishRequests = 0;
    await page.route('**/api/dishes', async (route) => {
      if (route.request().method() === 'GET') {
        dishRequests++;
        // Delay to ensure both callers fire while the first is in-flight
        await new Promise((r) => setTimeout(r, 500));
      }
      await route.continue();
    });

    // Navigate to ingredients — App mounts and calls preloadAllData() which
    // fetches /dishes in the background. Then immediately navigate to dishes
    // which triggers useEntityList → getDishes().
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    // Navigate to dishes while preloadAllData's GET /dishes may still be in-flight
    await page.click('text=Platos');
    await expect(page.locator('a[href^="/dishes/"]').first()).toBeVisible({ timeout: 10000 });

    // With deduplication, only 1 request should have reached the server
    expect(dishRequests).toBe(1);
  });
});
