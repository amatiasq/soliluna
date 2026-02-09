import { test, expect } from '@playwright/test';
import { seedDB } from './helpers/db';

test.describe('Offline', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/events*', (route) => route.abort());
    await seedDB();
  });

  test('datos siguen visibles al perder conexión', async ({ page }) => {
    // Load ingredients while online (data cached to IndexedDB)
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();
    const countBefore = await page.locator('input[placeholder="Nombre"]').count();
    expect(countBefore).toBe(6);

    // Allow IndexedDB cache write (from stale-while-revalidate) to complete
    await page.waitForTimeout(1000);

    // Go offline
    await page.context().setOffline(true);

    // SPA navigation to recipes (uses cached data from IndexedDB)
    await page.click('text=Recetas');
    await expect(page.locator('a[href^="/recipes/"]').first()).toBeVisible({ timeout: 10000 });
    const recipeText = await page.locator('a[href^="/recipes/"]').first().textContent();
    expect(recipeText).toContain('Bizcocho base');

    // Navigate back to ingredients
    await page.click('text=Ingredientes');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible({ timeout: 10000 });

    await page.context().setOffline(false);
  });

  test('edición offline muestra indicador y sincroniza al reconectar', async ({ page }) => {
    // Load page while online
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    // Allow IndexedDB cache write to complete
    await page.waitForTimeout(1000);

    // Go offline
    await page.context().setOffline(true);

    // Edit a name
    const nameInput = page.locator('input[placeholder="Nombre"]').first();
    await nameInput.fill('Editado offline');

    // Wait for debounce + save attempt
    await page.waitForTimeout(1500);

    // Should show offline indicator
    await expect(page.locator('[title="Guardado localmente (sin conexion)"]').first()).toBeVisible({
      timeout: 5000,
    });

    // Set up a listener for the outbox flush PUT request BEFORE going online
    const flushDone = page.waitForResponse(
      (res) => res.request().method() === 'PUT' && res.url().includes('/api/ingredients/'),
      { timeout: 15000 },
    );

    // Go back online — sync listener will await flushOutbox then preload
    await page.context().setOffline(false);

    // Wait for the outbox PUT to actually complete
    const flushRes = await flushDone;
    expect(flushRes.status()).toBe(200);

    // Give preloadAllData time to finish
    await page.waitForTimeout(2000);

    // Reload to get fresh server data
    await page.reload();
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    // Use polling assertion to handle stale-while-revalidate timing
    await expect(async () => {
      const inputs = await page.locator('input[placeholder="Nombre"]').all();
      const names = await Promise.all(inputs.map((input) => input.inputValue()));
      expect(names).toContain('Editado offline');
    }).toPass({ timeout: 15000 });
  });

  test('navegación offline entre páginas cacheadas', async ({ page }) => {
    // Visit multiple pages to populate IndexedDB cache
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();
    // Allow IndexedDB cache write to complete
    await page.waitForTimeout(1000);

    await page.goto('/recipes');
    await expect(page.locator('a[href^="/recipes/"]').first()).toBeVisible();

    await page.goto('/dishes');
    await expect(page.locator('a[href^="/dishes/"]').first()).toBeVisible();

    // Go offline and navigate via SPA (no full page reload)
    await page.context().setOffline(true);

    await page.click('text=Ingredientes');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible({ timeout: 10000 });

    await page.click('text=Recetas');
    await expect(page.locator('a[href^="/recipes/"]').first()).toBeVisible({ timeout: 10000 });

    await page.click('text=Platos');
    await expect(page.locator('a[href^="/dishes/"]').first()).toBeVisible({ timeout: 10000 });

    await page.context().setOffline(false);
  });

  test('primera navegación offline sin visitar la página antes', async ({ page }) => {
    // Only visit ingredients — recipes and dishes are cached by preloadAllData()
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    // Wait for preloadAllData to finish caching all entity types
    await page.waitForTimeout(2000);

    // Go offline WITHOUT having visited recipes or dishes directly
    await page.context().setOffline(true);

    // Navigate to Recetas — data should come from IndexedDB (populated by preloadAllData)
    await page.click('text=Recetas');
    await expect(page.locator('a[href^="/recipes/"]').first()).toBeVisible({ timeout: 10000 });
    // No error should be shown
    await expect(page.locator('text=Error al cargar datos')).not.toBeVisible();

    // Navigate to Platos
    await page.click('text=Platos');
    await expect(page.locator('a[href^="/dishes/"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Error al cargar datos')).not.toBeVisible();

    await page.context().setOffline(false);
  });

  test('reconectar tras edición offline: solo 1 PUT sin 409', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();
    await page.waitForTimeout(1000);

    // Go offline
    await page.context().setOffline(true);

    // Edit one ingredient
    const nameInput = page.locator('input[placeholder="Nombre"]').first();
    await nameInput.fill('Editado para sync');
    await page.waitForTimeout(1500);

    // Track all PUT requests and their statuses
    const putResults: { url: string; status: number }[] = [];
    page.on('response', (res) => {
      if (res.request().method() === 'PUT' && res.url().includes('/api/ingredients/')) {
        putResults.push({ url: res.url(), status: res.status() });
      }
    });

    // Reconnect
    await page.context().setOffline(false);

    // Wait for outbox flush
    await expect(async () => {
      expect(putResults.length).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 15000 });

    // Give time for any stray PUTs to fire
    await page.waitForTimeout(3000);

    // Only 1 PUT should have fired (the edited ingredient), no mass PUTs
    expect(putResults.length).toBe(1);
    // And it should succeed (no 409 Conflict)
    expect(putResults[0].status).toBe(200);
  });

  test('cola de cambios offline se sincroniza en orden', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    // Allow IndexedDB cache write to complete
    await page.waitForTimeout(1000);

    // Go offline
    await page.context().setOffline(true);

    // Make multiple edits to different ingredients
    const nameInputs = await page.locator('input[placeholder="Nombre"]').all();
    await nameInputs[0].fill('Offline cambio 1');
    await page.waitForTimeout(1000);
    await nameInputs[1].fill('Offline cambio 2');
    await page.waitForTimeout(1000);

    // At least one offline indicator should be visible
    await expect(page.locator('[title="Guardado localmente (sin conexion)"]').first()).toBeVisible();

    // Set up listeners for outbox flush PUT requests BEFORE going online
    const putResponses: string[] = [];
    page.on('response', (res) => {
      if (res.request().method() === 'PUT' && res.url().includes('/api/ingredients/')) {
        putResponses.push(res.url());
      }
    });

    // Go back online
    await page.context().setOffline(false);

    // Wait until we see at least 2 PUT responses (one per edit)
    await expect(async () => {
      expect(putResponses.length).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 15000 });

    // Give preloadAllData time to finish
    await page.waitForTimeout(2000);

    // Reload and verify both changes synced
    await page.reload();
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    // Use polling assertion for stale-while-revalidate
    await expect(async () => {
      const inputs = await page.locator('input[placeholder="Nombre"]').all();
      const names = await Promise.all(inputs.map((input) => input.inputValue()));
      expect(names).toContain('Offline cambio 1');
      expect(names).toContain('Offline cambio 2');
    }).toPass({ timeout: 15000 });
  });
});
