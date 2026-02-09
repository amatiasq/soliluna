import { test, expect } from '@playwright/test';
import { seedDB } from './helpers/db';

async function getInputValues(page, placeholder: string): Promise<string[]> {
  const inputs = await page.locator(`input[placeholder="${placeholder}"]`).all();
  return Promise.all(inputs.map((input) => input.inputValue()));
}

test.describe('Cálculo de costes', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/events*', (route) => route.abort());
    await seedDB();
  });

  test('coste simple de ingrediente en receta', async ({ page }) => {
    // Bizcocho: harina 300g (120c/1000g) = 36c, huevos 4u (240c/12u) = 80c,
    // mantequilla 150g (250c/250g) = 150c, azúcar 200g (90c/1000g) = 18c
    // Total: 36+80+150+18 = 284 cents = 2,84€
    await page.goto('/recipes');
    await expect(page.locator('a[href^="/recipes/"]').first()).toBeVisible();
    await page.click('text=Bizcocho base');
    await expect(page).toHaveURL(/\/recipes\/.+/);
    await expect(page.locator('input[placeholder="Nombre de la receta"]')).toBeVisible();

    await expect(page.getByText('Coste total:')).toBeVisible();
    await expect(page.getByText('2,84')).toBeVisible({ timeout: 10000 });
  });

  test('conversión de unidades (ml → l)', async ({ page }) => {
    // Leche: 1l at 100 cents. Tarta uses 500ml → convert(500,ml,l)=0.5 → (100/1)*0.5 = 50c = 0,50€
    await page.goto('/dishes');
    await expect(page.locator('a[href^="/dishes/"]').first()).toBeVisible();
    await page.locator('a[href^="/dishes/"]').filter({ hasText: 'Tarta cumpleaños' }).click();
    await expect(page).toHaveURL(/\/dishes\/.+/);
    await expect(page.locator('input[placeholder="Nombre del plato"]')).toBeVisible();

    // 0,50€ appears twice (individual cost + subtotal) — use .first()
    await expect(page.getByText('Ingredientes:')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('0,50').first()).toBeVisible({ timeout: 10000 });
  });

  test('unidades discretas (u)', async ({ page }) => {
    // Huevos: 12u at 240 cents. Bizcocho uses 4u → (240/12)*4 = 80c = 0,80€
    await page.goto('/recipes');
    await expect(page.locator('a[href^="/recipes/"]').first()).toBeVisible();
    await page.click('text=Bizcocho base');
    await expect(page).toHaveURL(/\/recipes\/.+/);
    await expect(page.locator('input[placeholder="Nombre de la receta"]')).toBeVisible();

    // 0,80€ should be visible as individual ingredient cost
    await expect(page.getByText('0,80')).toBeVisible({ timeout: 10000 });
  });

  test('receta escalada en plato', async ({ page }) => {
    // Bizcocho: 1kg yield, 284c cost. Tarta uses 0.75kg → (284/1)*0.75 = 213c = 2,13€
    await page.goto('/dishes');
    await expect(page.locator('a[href^="/dishes/"]').first()).toBeVisible();
    await page.locator('a[href^="/dishes/"]').filter({ hasText: 'Tarta cumpleaños' }).click();
    await expect(page).toHaveURL(/\/dishes\/.+/);
    await expect(page.locator('input[placeholder="Nombre del plato"]')).toBeVisible();

    // 2,13€ appears twice (individual cost + subtotal) — use .first()
    await expect(page.getByText('Recetas:')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('2,13').first()).toBeVisible({ timeout: 10000 });
  });

  test('cambio de precio propaga a receta', async ({ page }) => {
    // Change harina price from 1,20€ (120c) to 2,40€ (240c)
    // input[type=number] requires dots, not commas
    await page.goto('/ingredients');
    await expect(page.locator('input[placeholder="Nombre"]').first()).toBeVisible();

    const names = await getInputValues(page, 'Nombre');
    const harinIdx = names.findIndex((n) => n === 'Harina de trigo');
    expect(harinIdx).toBeGreaterThanOrEqual(0);

    const priceInput = page.locator('input[placeholder="Precio €"]').nth(harinIdx);
    await priceInput.click();
    await priceInput.fill('2.40');
    // Click elsewhere to blur — React 17+ uses focusout, not blur
    await page.locator('input[placeholder="Nombre"]').nth(harinIdx).click();
    await page.waitForTimeout(2000);

    // Navigate to Bizcocho - cost should reflect new price
    // Old: 36+80+150+18 = 284. Harina now: (240/1000)*300 = 72 (+36). New total: 320c = 3,20€
    await page.goto('/recipes');
    await expect(page.locator('a[href^="/recipes/"]').first()).toBeVisible();
    await page.click('text=Bizcocho base');
    await expect(page).toHaveURL(/\/recipes\/.+/);
    await expect(page.locator('input[placeholder="Nombre de la receta"]')).toBeVisible();

    await expect(page.getByText('3,20')).toBeVisible({ timeout: 10000 });
  });

  test('plato completo: ingredientes + recetas + multiplicador', async ({ page }) => {
    // Tarta cumpleaños:
    // Ingredientes: leche 500ml = 50c (0,50€)
    // Recetas: bizcocho 0.75kg = 213c (2,13€)
    // Coste base: 50 + 213 = 263c (2,63€)
    // Multiplicador: x3
    // Precio final: 263 * 3 = 789c (7,89€)
    await page.goto('/dishes');
    await expect(page.locator('a[href^="/dishes/"]').first()).toBeVisible();
    await page.locator('a[href^="/dishes/"]').filter({ hasText: 'Tarta cumpleaños' }).click();
    await expect(page).toHaveURL(/\/dishes\/.+/);
    await expect(page.locator('input[placeholder="Nombre del plato"]')).toBeVisible();

    // Cost values may appear in both individual rows and summary — use .first()
    await expect(page.getByText('Ingredientes:')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('0,50').first()).toBeVisible();
    await expect(page.getByText('Recetas:')).toBeVisible();
    await expect(page.getByText('2,13').first()).toBeVisible();
    await expect(page.getByText('Coste base:')).toBeVisible();
    await expect(page.getByText('2,63')).toBeVisible();
    await expect(page.getByText('Precio final')).toBeVisible();
    await expect(page.getByText('7,89')).toBeVisible();
  });
});
