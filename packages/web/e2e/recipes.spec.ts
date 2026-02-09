import { test, expect } from '@playwright/test';
import { seedDB } from './helpers/db';

test.describe('Recetas', () => {
  test.beforeEach(async ({ page }) => {
    // Block SSE connections to prevent wrangler Durable Object instability
    await page.route('**/api/events*', (route) => route.abort());
    await seedDB();
  });

  test('lista recetas con nombre y coste', async ({ page }) => {
    await page.goto('/recipes');
    const listItems = page.locator('a[href^="/recipes/"]');
    await expect(listItems.first()).toBeVisible();

    const text = await listItems.first().textContent();
    expect(text).toContain('Bizcocho base');
    // Cost should be 2,84 € (284 cents)
    expect(text).toContain('2,84');
  });

  test('crear receta y navegar al detalle', async ({ page }) => {
    test.slow(); // API can be slow under load
    await page.goto('/recipes');
    // Wait for the list to load before clicking add
    await expect(page.locator('a[href^="/recipes/"]').first()).toBeVisible();

    await page.click('button[title="Nueva receta"]');

    // Should navigate to the detail page (URL change implies API succeeded)
    await expect(page).toHaveURL(/\/recipes\/.+/, { timeout: 20000 });
    const nameInput = page.locator('input[placeholder="Nombre de la receta"]');
    await expect(nameInput).toBeVisible();
  });

  test('editar metadatos con auto-save', async ({ page }) => {
    await page.goto('/recipes');
    await expect(page.locator('a[href^="/recipes/"]').first()).toBeVisible();
    await page.click('a[href^="/recipes/"]');
    await expect(page).toHaveURL(/\/recipes\/.+/);

    const nameInput = page.locator('input[placeholder="Nombre de la receta"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Bizcocho chocolate');
    await page.waitForTimeout(1500);

    // Reload and verify
    await page.reload();
    await expect(nameInput).toHaveValue('Bizcocho chocolate');
  });

  test('coste total correcto con ingredientes conocidos', async ({ page }) => {
    await page.goto('/recipes');
    await expect(page.locator('a[href^="/recipes/"]').first()).toBeVisible();
    await page.click('text=Bizcocho base');
    await expect(page).toHaveURL(/\/recipes\/.+/);

    // Bizcocho: 300g harina(36) + 4u huevos(80) + 150g mantequilla(150) + 200g azucar(18) = 284 cents
    // Wait for cost to appear on the page
    await expect(page.getByText('Coste total:')).toBeVisible();
    await expect(page.getByText('2,84')).toBeVisible({ timeout: 10000 });
  });

  test('añadir ingrediente a receta', async ({ page }) => {
    await page.goto('/recipes');
    await expect(page.locator('a[href^="/recipes/"]').first()).toBeVisible();
    await page.click('text=Bizcocho base');
    await expect(page).toHaveURL(/\/recipes\/.+/);

    const nameInput = page.locator('input[placeholder="Nombre de la receta"]');
    await expect(nameInput).toBeVisible();

    // Bizcocho has 4 ingredients
    const deleteButtons = page.locator('button[title="Eliminar"]');
    await expect(deleteButtons).toHaveCount(4);

    // Add a new ingredient
    await page.click('button[title="Nuevo ingrediente"]');
    await expect(deleteButtons).toHaveCount(5);

    // Change the new ingredient to one not already in the recipe
    // (default may duplicate an existing one, causing UNIQUE constraint error)
    // New row is the last one: its ingredient picker is the second-to-last select
    const selectCount = await page.locator('select').count();
    const newIngredientPicker = page.locator('select').nth(selectCount - 2);
    await newIngredientPicker.selectOption({ label: 'Leche entera' });

    // Wait for auto-save
    await page.waitForTimeout(1500);

    // Reload and verify the new ingredient persisted
    await page.reload();
    await expect(nameInput).toBeVisible();
    await expect(deleteButtons).toHaveCount(5);
  });

  test('eliminar ingrediente de receta', async ({ page }) => {
    await page.goto('/recipes');
    await expect(page.locator('a[href^="/recipes/"]').first()).toBeVisible();
    await page.click('text=Bizcocho base');
    await expect(page).toHaveURL(/\/recipes\/.+/);

    const nameInput = page.locator('input[placeholder="Nombre de la receta"]');
    await expect(nameInput).toBeVisible();

    const deleteButtons = page.locator('button[title="Eliminar"]');
    await expect(deleteButtons).toHaveCount(4);

    // Verify initial cost
    await expect(page.getByText('2,84')).toBeVisible({ timeout: 10000 });

    // Remove the last ingredient
    await deleteButtons.last().click();
    await expect(deleteButtons).toHaveCount(3);

    // Wait for auto-save
    await page.waitForTimeout(1500);

    // Reload and verify ingredient is still removed
    await page.reload();
    await expect(nameInput).toBeVisible();
    await expect(deleteButtons).toHaveCount(3);
    // Cost should have changed (no longer 2,84€)
    await expect(page.getByText('Coste total:')).toBeVisible();
    await expect(page.getByText('2,84')).not.toBeVisible();
  });

  test('eliminar receta', async ({ page }) => {
    test.slow(); // API can be slow under load
    // Use "Galletas test" from seed data (not used in any dish)
    await page.goto('/recipes');
    await expect(page.locator('a[href^="/recipes/"]').first()).toBeVisible();
    await page.click('text=Galletas test');
    await expect(page).toHaveURL(/\/recipes\/.+/);

    const nameInput = page.locator('input[placeholder="Nombre de la receta"]');
    await expect(nameInput).toBeVisible();

    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button[title="Eliminar receta"]');

    // Should navigate back to recipes list (URL change implies API succeeded)
    await expect(page).toHaveURL('/recipes', { timeout: 20000 });
    // Wait for the list to update (stale-while-revalidate may initially show cached data)
    await expect(page.getByText('Galletas test')).not.toBeVisible({ timeout: 10000 });
  });

  test('no eliminar receta usada en plato', async ({ page }) => {
    await page.goto('/recipes');
    await expect(page.locator('a[href^="/recipes/"]').first()).toBeVisible();
    await page.click('text=Bizcocho base');
    await expect(page).toHaveURL(/\/recipes\/.+/);

    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button[title="Eliminar receta"]');

    // Should show an error alert (caught by DeleteButton)
    // and stay on the same page
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/recipes\/.+/);
  });
});
