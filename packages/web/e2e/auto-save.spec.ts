import { test, expect } from '@playwright/test';
import { seedDB } from './helpers/db';

async function getInputValues(page, placeholder: string): Promise<string[]> {
  const inputs = await page.locator(`input[placeholder="${placeholder}"]`).all();
  return Promise.all(inputs.map((input) => input.inputValue()));
}

test.describe('Auto-save', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/events*', (route) => route.abort());
    await seedDB();
  });

  test('debounce: múltiples ediciones rápidas generan una sola petición', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    // Track PUT calls to the ingredients API
    let putCalls = 0;
    await page.route('**/api/ingredients/**', (route) => {
      if (route.request().method() === 'PUT') putCalls++;
      route.continue();
    });

    // Make 3 quick edits within the debounce window (500ms)
    const nameInput = page.locator('input[placeholder="Nombre"]').first();
    await nameInput.fill('A');
    await page.waitForTimeout(100);
    await nameInput.fill('Ab');
    await page.waitForTimeout(100);
    await nameInput.fill('Abc');

    // Wait for debounce (500ms) + save to complete
    await page.waitForTimeout(2000);

    // Should have made only 1 API call (debounce collapsed the edits)
    expect(putCalls).toBe(1);
  });

  test('indicador transiciones: pendiente → guardando → guardado', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    // Slow down PUT to make "Guardando..." state observable
    await page.route('**/api/ingredients/**', async (route) => {
      if (route.request().method() === 'PUT') {
        await new Promise((r) => setTimeout(r, 1000));
        await route.continue();
      } else {
        await route.continue();
      }
    });

    const nameInput = page.locator('input[placeholder="Nombre"]').first();
    await nameInput.fill('Test transición');

    // Should quickly show "Pendiente"
    await expect(page.locator('[title="Pendiente"]').first()).toBeVisible({ timeout: 1000 });

    // Then "Guardando..." after debounce (500ms)
    await expect(page.locator('[title="Guardando..."]').first()).toBeVisible({ timeout: 2000 });

    // Then back to "Guardado" after the delayed API response
    await expect(page.locator('[title="Guardado"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('guardar sin botón: editar y esperar persiste cambios', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    const nameInput = page.locator('input[placeholder="Nombre"]').first();
    await nameInput.fill('Auto-guardado sin botón');

    // No button click — wait for auto-save debounce + save
    await page.waitForTimeout(2000);

    // Reload and verify
    await page.reload();
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();
    const inputs = await page.locator('input[placeholder="Nombre"]').all();
    const names = await Promise.all(inputs.map((input) => input.inputValue()));
    expect(names).toContain('Auto-guardado sin botón');
  });

  test('validación: nombre vacío no guarda', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    let putCalls = 0;
    await page.route('**/api/ingredients/**', (route) => {
      if (route.request().method() === 'PUT') putCalls++;
      route.continue();
    });

    const nameInput = page.locator('input[placeholder="Nombre"]').first();
    const originalName = await nameInput.inputValue();
    await nameInput.fill('');

    // Wait for debounce + save cycle
    await page.waitForTimeout(1500);

    // handleSave returns early for empty name — no API call
    expect(putCalls).toBe(0);

    // Reload: original name should be restored from server
    await page.reload();
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();
    const inputs = await page.locator('input[placeholder="Nombre"]').all();
    const names = await Promise.all(inputs.map((input) => input.inputValue()));
    expect(names).toContain(originalName);
  });

  test('múltiples campos se guardan correctamente', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    // Edit both name and price of the first ingredient quickly
    const nameInput = page.locator('input[placeholder="Nombre"]').first();
    await nameInput.fill('Nombre editado test');

    // input[type=number] requires dots, not commas
    const priceInput = page.locator('input[placeholder="Precio €"]').first();
    await priceInput.click();
    await priceInput.fill('5.00');
    // Click elsewhere to blur — React 17+ uses focusout, not blur
    await nameInput.click();

    // Wait for auto-save
    await page.waitForTimeout(2000);

    // Reload and verify both changes persisted
    await page.reload();
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();
    // Use polling assertion: stale-while-revalidate may initially show cached data
    await expect(async () => {
      const inputs = await page.locator('input[placeholder="Nombre"]').all();
      const names = await Promise.all(inputs.map((input) => input.inputValue()));
      expect(names).toContain('Nombre editado test');
    }).toPass({ timeout: 10000 });

    // Find the edited ingredient's price
    const namesAfter = await getInputValues(page, 'Nombre');
    const editedIdx = namesAfter.findIndex((n) => n === 'Nombre editado test');
    await expect(page.locator('input[placeholder="Precio €"]').nth(editedIdx)).toHaveValue('5');
  });
});
