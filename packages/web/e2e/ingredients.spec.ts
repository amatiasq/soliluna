import { test, expect } from '@playwright/test';
import { seedDB } from './helpers/db';

async function getInputValues(page, placeholder: string): Promise<string[]> {
  const inputs = await page.locator(`input[placeholder="${placeholder}"]`).all();
  return Promise.all(inputs.map((input) => input.inputValue()));
}

test.describe('Ingredientes', () => {
  test.beforeEach(async ({ page }) => {
    // Block SSE connections to prevent wrangler Durable Object instability
    await page.route('**/api/events*', (route) => route.abort());
    await seedDB();
  });

  test('lista ingredientes ordenados por nombre', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    const values = await getInputValues(page, 'Nombre');
    expect(values).toContain('Azúcar');
    expect(values).toContain('Harina de trigo');
    expect(values).toContain('Huevos');
    expect(values).toContain('Canela');
    expect(values.length).toBe(6);
  });

  test('crear ingrediente', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();
    const countBefore = await page.locator('input[placeholder="Nombre"]').count();

    await page.click('button[title="Nuevo ingrediente"]');
    // Wait for the new row to appear
    await expect(page.locator('input[placeholder="Nombre"]')).toHaveCount(countBefore + 1);
  });

  test('editar nombre con auto-save', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    const nameInput = page.locator('input[placeholder="Nombre"]').first();
    await nameInput.fill('Almendra molida');
    // Wait for auto-save debounce + save
    await page.waitForTimeout(1500);

    // Reload and verify
    await page.reload();
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();
    const names = await getInputValues(page, 'Nombre');
    expect(names).toContain('Almendra molida');
  });

  test('editar precio', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    // Find the first ingredient and its price
    const names = await getInputValues(page, 'Nombre');
    const firstIdx = 0;
    const firstName = names[firstIdx];

    // Edit the price input — input[type=number] requires dots, not commas
    const priceInput = page.locator('input[placeholder="Precio €"]').nth(firstIdx);
    await priceInput.click();
    await priceInput.fill('2.50');
    // Click elsewhere to blur — React 17+ uses focusout, not blur
    await page.locator('input[placeholder="Nombre"]').first().click();

    // Wait for auto-save debounce + save
    await page.waitForTimeout(2000);

    // Reload and verify the price persisted
    await page.reload();
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    // Find the same ingredient after reload (order may differ)
    const namesAfter = await getInputValues(page, 'Nombre');
    const idxAfter = namesAfter.findIndex((n) => n === firstName);
    const priceInputAfter = page.locator('input[placeholder="Precio €"]').nth(idxAfter);
    await expect(priceInputAfter).toHaveValue('2.5');
  });

  test('cambiar unidad', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    // Get all name inputs to find the index
    const allNames = await getInputValues(page, 'Nombre');
    const azucarIdx = allNames.findIndex((n) => n === 'Azúcar');
    expect(azucarIdx).toBeGreaterThanOrEqual(0);

    // Change the unit select for Azúcar (currently 'kg') to 'g'
    const unitSelect = page.locator('select').nth(azucarIdx);
    await unitSelect.selectOption('g');

    // Wait for auto-save debounce + save
    await page.waitForTimeout(1500);

    // Reload and verify the unit changed
    await page.reload();
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    const allNamesAfter = await getInputValues(page, 'Nombre');
    const azucarIdxAfter = allNamesAfter.findIndex((n) => n === 'Azúcar');
    const unitSelectAfter = page.locator('select').nth(azucarIdxAfter);
    await expect(unitSelectAfter).toHaveValue('g');
  });

  test('validación nombre vacío', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    let putCalls = 0;
    await page.route('**/api/ingredients/**', (route) => {
      if (route.request().method() === 'PUT') putCalls++;
      route.continue();
    });

    // Remember the original name
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
    const names = await getInputValues(page, 'Nombre');
    expect(names).toContain(originalName);
  });

  test('eliminar ingrediente sin uso', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();
    const countBefore = await page.locator('input[placeholder="Nombre"]').count();

    // Find "Canela" - an unused ingredient from the seed data
    const allNames = await getInputValues(page, 'Nombre');
    const canelaIdx = allNames.findIndex((n) => n === 'Canela');
    expect(canelaIdx).toBeGreaterThanOrEqual(0);

    // Accept the confirm dialog on delete
    page.on('dialog', (dialog) => dialog.accept());

    // Delete Canela
    const deleteButton = page.locator('button[title="Eliminar"]').nth(canelaIdx);
    await deleteButton.click();

    await expect(page.locator('input[placeholder="Nombre"]')).toHaveCount(countBefore - 1);

    // Verify Canela is gone
    const namesAfter = await getInputValues(page, 'Nombre');
    expect(namesAfter).not.toContain('Canela');
  });

  test('no eliminar ingrediente usado en receta', async ({ page }) => {
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    // Try to delete "Harina de trigo" which is used in Bizcocho
    page.on('dialog', (dialog) => dialog.accept());

    // Find the row with Harina de trigo
    const allNames = await getInputValues(page, 'Nombre');
    const harinIdx = allNames.findIndex((n) => n === 'Harina de trigo');
    expect(harinIdx).toBeGreaterThanOrEqual(0);

    const deleteButton = page.locator('button[title="Eliminar"]').nth(harinIdx);
    await deleteButton.click();
    await page.waitForTimeout(1000);

    // Should still be in the list (deletion rejected)
    const namesAfter = await getInputValues(page, 'Nombre');
    expect(namesAfter).toContain('Harina de trigo');
  });
});
