import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('PWA', () => {
  test('manifest válido con campos requeridos', async () => {
    // VitePWA doesn't serve the manifest in dev mode.
    // Instead, verify the manifest configuration in vite.config.ts.
    const configPath = path.join(__dirname, '..', 'vite.config.ts');
    const configContent = fs.readFileSync(configPath, 'utf-8');

    // The manifest must have required PWA fields
    expect(configContent).toContain("name: 'Soliluna'");
    expect(configContent).toContain("start_url: '/'");
    expect(configContent).toContain("display: 'standalone'");
    expect(configContent).toContain('icons:');
  });

  test('viewport mobile sin overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 }); // Pixel 7
    await page.goto('/ingredients');
    await page.waitForTimeout(2000);

    // Check that the body does not have horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding
  });
});
