import { test, expect } from '@playwright/test';
import { seedDB } from './helpers/db';

test.describe('Platos', () => {
  test.beforeEach(async ({ page }) => {
    // Block SSE connections to prevent wrangler Durable Object instability
    await page.route('**/api/events*', (route) => route.abort());
    await seedDB();
  });

  test('lista platos con orden correcto (sin fecha primero)', async ({ page }) => {
    await page.goto('/dishes');
    const listItems = page.locator('a[href^="/dishes/"]');
    await expect(listItems.first()).toBeVisible();

    // "Pedido pendiente" (null date) should come before "Tarta cumpleaños"
    const firstText = await listItems.first().textContent();
    expect(firstText).toContain('Pedido pendiente');
  });

  test('crear plato y navegar al detalle', async ({ page }) => {
    await page.goto('/dishes');
    await expect(page.locator('a[href^="/dishes/"]').first()).toBeVisible();

    await page.click('button[title="Nuevo plato"]');

    await expect(page).toHaveURL(/\/dishes\/.+/, { timeout: 10000 });
    const nameInput = page.locator('input[placeholder="Nombre del plato"]');
    await expect(nameInput).toBeVisible();
  });

  test('editar metadatos con auto-save', async ({ page }) => {
    await page.goto('/dishes');
    await expect(page.locator('a[href^="/dishes/"]').first()).toBeVisible();
    await page.click('text=Tarta cumpleaños');
    await expect(page).toHaveURL(/\/dishes\/.+/);

    const nameInput = page.locator('input[placeholder="Nombre del plato"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Tarta de cumpleaños editada');
    await page.waitForTimeout(1500);

    await page.reload();
    await expect(nameInput).toHaveValue('Tarta de cumpleaños editada');
  });

  test('coste y precio final con multiplicador', async ({ page }) => {
    await page.goto('/dishes');
    await expect(page.locator('a[href^="/dishes/"]').first()).toBeVisible();
    await page.locator('a[href^="/dishes/"]').filter({ hasText: 'Tarta cumpleaños' }).click();
    await expect(page).toHaveURL(/\/dishes\/.+/);

    // Wait for the detail page to fully load (needs ingredients + recipes catalogs)
    await expect(page.locator('input[placeholder="Nombre del plato"]')).toBeVisible();

    // baseCost = 50 (leche 500ml) + 213 (bizcocho 750g) = 263 cents
    // finalPrice = 263 * 3 = 789 cents = 7,89€
    await expect(page.getByText('Precio final')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('7,89')).toBeVisible({ timeout: 10000 });
  });

  test('añadir ingrediente directo al plato', async ({ page }) => {
    await page.goto('/dishes');
    await expect(page.locator('a[href^="/dishes/"]').first()).toBeVisible();
    await page.click('text=Pedido pendiente');
    await expect(page).toHaveURL(/\/dishes\/.+/);
    await expect(page.locator('input[placeholder="Nombre del plato"]')).toBeVisible();

    // Pedido pendiente has no ingredients
    await expect(page.getByText('Sin ingredientes.')).toBeVisible();

    await page.click('button[title="Añadir ingrediente"]');
    await expect(page.getByText('Sin ingredientes.')).not.toBeVisible();

    // Wait for auto-save
    await page.waitForTimeout(1500);

    // Reload and verify ingredient persisted
    await page.reload();
    await expect(page.locator('input[placeholder="Nombre del plato"]')).toBeVisible();
    await expect(page.getByText('Sin ingredientes.')).not.toBeVisible();
  });

  test('añadir receta al plato', async ({ page }) => {
    await page.goto('/dishes');
    await expect(page.locator('a[href^="/dishes/"]').first()).toBeVisible();
    await page.click('text=Pedido pendiente');
    await expect(page).toHaveURL(/\/dishes\/.+/);
    await expect(page.locator('input[placeholder="Nombre del plato"]')).toBeVisible();

    // Pedido pendiente has no recipes
    await expect(page.getByText('Sin recetas.')).toBeVisible();

    await page.click('button[title="Añadir receta"]');
    await expect(page.getByText('Sin recetas.')).not.toBeVisible();

    // Wait for auto-save
    await page.waitForTimeout(1500);

    // Reload and verify recipe persisted
    await page.reload();
    await expect(page.locator('input[placeholder="Nombre del plato"]')).toBeVisible();
    await expect(page.getByText('Sin recetas.')).not.toBeVisible();
  });

  test('cambiar multiplicador actualiza precio final', async ({ page }) => {
    await page.goto('/dishes');
    await expect(page.locator('a[href^="/dishes/"]').first()).toBeVisible();
    await page.locator('a[href^="/dishes/"]').filter({ hasText: 'Tarta cumpleaños' }).click();
    await expect(page).toHaveURL(/\/dishes\/.+/);
    await expect(page.locator('input[placeholder="Nombre del plato"]')).toBeVisible();

    // Initially multiplier=3, baseCost=263, finalPrice=789 (7,89€)
    await expect(page.getByText('7,89')).toBeVisible({ timeout: 10000 });

    // Change multiplier to x2 (multiplier select is in the same row as the date input)
    const multiplierSelect = page.locator('input[type="date"]').locator('xpath=..').locator('select');
    await multiplierSelect.selectOption('2');

    // finalPrice = 263 * 2 = 526 (5,26€)
    await expect(page.getByText('5,26')).toBeVisible({ timeout: 5000 });

    // Wait for auto-save
    await page.waitForTimeout(1500);

    // Reload and verify
    await page.reload();
    await expect(page.locator('input[placeholder="Nombre del plato"]')).toBeVisible();
    await expect(page.getByText('5,26')).toBeVisible({ timeout: 10000 });
  });

  test('eliminar plato', async ({ page }) => {
    await page.goto('/dishes');
    await expect(page.locator('a[href^="/dishes/"]').first()).toBeVisible();
    await page.click('text=Pedido pendiente');
    await expect(page).toHaveURL(/\/dishes\/.+/);
    await expect(page.locator('input[placeholder="Nombre del plato"]')).toBeVisible();

    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button[title="Eliminar plato"]');

    await expect(page).toHaveURL('/dishes');
    const listText = await page.textContent('body');
    expect(listText).not.toContain('Pedido pendiente');
  });

  test('fecha nullable persiste', async ({ page }) => {
    await page.goto('/dishes');
    await expect(page.locator('a[href^="/dishes/"]').first()).toBeVisible();
    await page.click('button[title="Nuevo plato"]');
    await expect(page).toHaveURL(/\/dishes\/.+/, { timeout: 10000 });

    const nameInput = page.locator('input[placeholder="Nombre del plato"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Plato sin fecha');
    await page.waitForTimeout(1500);

    // Don't set a date - reload and verify it's still empty
    await page.reload();
    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toHaveValue('');
  });
});
