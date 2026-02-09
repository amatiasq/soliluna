# Soliluna v3 — Estrategia de Testing

## 1. Principios

- **E2E como fuente de verdad:** Los tests end-to-end verifican el comportamiento real de la app tal como la usa el usuario. Son el pilar de la estrategia de testing.
- **Tests contra entorno real (local):** Los E2E corren contra `wrangler dev` (Worker + D1 local) + Vite dev server, no contra mocks.
- **Cada test empieza con DB limpia:** Antes de cada suite se resetea D1 local para evitar dependencias entre tests.
- **Offline se testea de verdad:** Playwright permite cortar la red a nivel de navegador, simulando offline real.

---

## 2. Stack de testing

| Herramienta | Rol | Razón |
|-------------|-----|-------|
| **Playwright** | E2E browser tests | Soporte multi-browser, network emulation, mobile viewports, PWA testing |
| **Vitest** | Unit tests (`shared`) | Ya usado en el proyecto, rápido, compatible Vite |
| **wrangler dev** | Backend local para E2E | D1 local (SQLite file), mismo runtime que producción |

### Ubicación de archivos

```
soliluna.v3/
├── packages/
│   ├── shared/
│   │   └── src/__tests__/         # Unit tests (vitest)
│   │       ├── conversion.test.ts
│   │       └── cost.test.ts
│   └── web/
│       └── e2e/                   # Tests E2E (playwright)
│           ├── fixtures/
│           │   └── seed.sql       # Datos de prueba
│           ├── helpers/
│           │   ├── db.ts          # Reset/seed DB entre tests
│           │   └── app.ts         # Page object helpers
│           ├── ingredients.spec.ts
│           ├── recipes.spec.ts
│           ├── dishes.spec.ts
│           ├── cost-calculation.spec.ts
│           ├── auto-save.spec.ts
│           ├── offline.spec.ts
│           └── pwa.spec.ts
├── playwright.config.ts
└── package.json                   # scripts: "test:e2e"
```

---

## 3. Configuración Playwright

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './packages/web/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // secuencial — comparten la DB local

  use: {
    baseURL: 'http://localhost:5173', // Vite dev server
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
      // Backend: Worker + D1 local
      command: 'pnpm --filter @soliluna/api dev',
      port: 8787,
      reuseExistingServer: !process.env.CI,
    },
    {
      // Frontend: Vite dev server (proxying /api → Worker)
      command: 'pnpm --filter @soliluna/web dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

---

## 4. Helpers

### Reset de DB entre tests

```ts
// e2e/helpers/db.ts
// Llama a un endpoint interno (solo activo en dev) para resetear la DB.

const API = 'http://localhost:8787';

export async function resetDB() {
  await fetch(`${API}/api/__test/reset`, { method: 'POST' });
}

export async function seedDB(sqlFile?: string) {
  await resetDB();
  if (sqlFile) {
    const sql = fs.readFileSync(sqlFile, 'utf-8');
    await fetch(`${API}/api/__test/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: sql,
    });
  }
}
```

**Nota:** Los endpoints `/__test/*` solo se registran cuando `env === 'development'`. En producción no existen.

### Page object helpers

```ts
// e2e/helpers/app.ts
import { Page } from '@playwright/test';

export class AppHelper {
  constructor(private page: Page) {}

  async goToIngredients() {
    await this.page.goto('/ingredients');
    await this.page.waitForSelector('[data-testid="ingredient-list"]');
  }

  async goToRecipes() { ... }
  async goToDishes() { ... }

  /** Espera a que el indicador de auto-save muestre "guardado" */
  async waitForSaved() {
    await this.page.waitForSelector('[data-testid="save-indicator"][data-state="idle"]');
  }

  /** Espera a que el indicador muestre "offline-saved" */
  async waitForOfflineSaved() {
    await this.page.waitForSelector('[data-testid="save-indicator"][data-state="offline"]');
  }
}
```

---

## 5. Suites E2E

### 5.1 Ingredientes — `ingredients.spec.ts`

| Test | Descripción |
|------|-------------|
| **Listar ingredientes** | Seed 3 ingredientes → navegar a `/ingredients` → verificar que aparecen los 3 con nombre, tamaño y precio |
| **Crear ingrediente** | Click "+" → rellenar nombre, tamaño, unidad, precio → verificar que aparece en la lista → recargar página → sigue ahí |
| **Editar ingrediente inline** | Cambiar nombre de un ingrediente → esperar auto-save ✓ → recargar → verificar nuevo nombre |
| **Editar precio** | Cambiar precio → esperar auto-save → verificar que el precio cambia |
| **Cambiar unidad** | Cambiar unidad de `kg` a `g` → esperar auto-save → recargar → verificar unidad |
| **Eliminar ingrediente** | Click eliminar → confirmar → verificar que desaparece de la lista |
| **No eliminar si en uso** | Seed ingrediente usado en una receta → intentar eliminar → verificar mensaje de error |
| **Validación** | Dejar nombre vacío → verificar indicador de error → no se guarda |

### 5.2 Recetas — `recipes.spec.ts`

| Test | Descripción |
|------|-------------|
| **Listar recetas** | Seed recetas → verificar lista con nombre y coste |
| **Crear receta** | Click "+" → nombre + yield → verificar en lista |
| **Editar metadatos** | Cambiar nombre y yield → auto-save → recargar → verificar |
| **Añadir ingrediente** | Abrir detalle → seleccionar ingrediente del picker → poner cantidad y unidad → verificar coste calculado |
| **Eliminar ingrediente de receta** | Quitar un ingrediente → verificar que el coste total baja → auto-save → recargar → sigue sin el ingrediente |
| **Coste total correcto** | Seed receta con 3 ingredientes conocidos → verificar que el coste mostrado coincide con el cálculo manual |
| **Eliminar receta** | Eliminar → ya no aparece en lista |
| **No eliminar si en uso** | Receta usada en un plato → error al eliminar |

### 5.3 Platos — `dishes.spec.ts`

| Test | Descripción |
|------|-------------|
| **Listar platos** | Verificar orden: sin fecha primero, luego por fecha desc |
| **Crear plato** | Nombre + PAX + fecha → aparece en lista |
| **Editar metadatos** | Cambiar nombre, PAX, fecha, notas → auto-save → recargar |
| **Añadir ingrediente directo** | Seleccionar ingrediente → cantidad → verificar coste |
| **Añadir receta** | Seleccionar receta → cantidad → verificar coste escalado |
| **Multiplicador** | Cambiar multiplicador de 1 a 3 → verificar que `finalPrice = baseCost × 3` |
| **Coste completo** | Plato con 2 ingredientes + 1 receta + multiplicador 2 → verificar baseCost y finalPrice |
| **Eliminar plato** | Eliminar → desaparece |
| **Fecha nullable** | Crear plato sin fecha → guardar → recargar → fecha sigue vacía |

### 5.4 Cálculo de costes — `cost-calculation.spec.ts`

Tests específicos para verificar la integridad de los cálculos end-to-end.

| Test | Descripción |
|------|-------------|
| **Coste simple** | Ingrediente: harina 1000g a 120 cents. Receta usa 500g → coste = 60 cents (0.60€) |
| **Conversión de unidades** | Ingrediente: leche 1l a 100 cents. Receta usa 250ml → coste = 25 cents (0.25€) |
| **Unidades (u)** | Ingrediente: huevos 12u a 240 cents. Receta usa 4u → coste = 80 cents (0.80€) |
| **Receta escalada en plato** | Receta genera 1.5kg y cuesta 384 cents. Plato usa 1kg → coste = 256 cents (2.56€) |
| **Cambio de precio propaga** | Cambiar precio de ingrediente → ir a receta que lo usa → verificar que el coste se recalculó |
| **Plato completo** | Montar plato con ingredientes + recetas + multiplicador → verificar baseCost y finalPrice al céntimo |

### 5.5 Auto-save — `auto-save.spec.ts`

| Test | Descripción |
|------|-------------|
| **Debounce funciona** | Editar campo rápidamente (3 keystrokes en <200ms) → verificar que solo hay 1 request al API (no 3) |
| **Indicador idle→pending→saving→idle** | Editar campo → verificar transición de estados del indicador |
| **Guardar sin botón** | Editar nombre de ingrediente → NO hacer click en ningún botón → esperar indicador ✓ → recargar → cambio persiste |
| **Error de validación no guarda** | Poner precio negativo → indicador rojo → recargar → valor anterior se mantiene |
| **Múltiples ediciones rápidas** | Editar campo A, inmediatamente editar campo B → ambos se guardan correctamente |

### 5.6 Offline — `offline.spec.ts`

| Test | Descripción |
|------|-------------|
| **Lectura offline** | Cargar ingredientes (online) → cortar red → recargar página → ingredientes siguen visibles desde cache |
| **Navegación offline** | Online: visitar ingredientes y recetas → cortar red → navegar entre ambas páginas → datos visibles |
| **Escritura offline + sync** | Online: abrir ingrediente → cortar red → editar nombre → indicador "offline saved" → restaurar red → esperar sync → recargar → cambio persiste |
| **Crear entidad offline** | Cortar red → crear ingrediente → indicador offline → restaurar red → sync → verificar que existe en servidor |
| **Cola de cambios (outbox)** | Cortar red → hacer 3 ediciones → restaurar red → verificar que las 3 se sincronizan en orden |
| **Conflicto LWW** | Dispositivo A edita ingrediente → Dispositivo B (simulado via API directa) edita el mismo → Dispositivo A reconecta → verificar resolución |

**Cómo simular offline en Playwright:**

```ts
// Cortar red
await page.context().setOffline(true);

// Restaurar red
await page.context().setOffline(false);
```

### 5.7 Real-time sync (SSE) — `realtime.spec.ts`

| Test | Descripción |
|------|-------------|
| **Update propaga entre pestañas** | Abrir 2 pestañas → editar ingrediente en pestaña A → verificar que pestaña B se actualiza en <2s |
| **Create propaga** | Crear receta en pestaña A → aparece en lista de pestaña B sin recargar |
| **Delete propaga** | Eliminar plato en pestaña A → desaparece de la lista de pestaña B |
| **No se notifica al emisor** | Editar en pestaña A → pestaña A NO recibe evento SSE de su propio cambio (no doble render) |
| **Fallback a polling sin SSE** | Bloquear `/api/events` → editar en pestaña A → pestaña B se actualiza al siguiente ciclo de polling (~60s) |
| **Reconexión SSE** | Cortar conexión SSE (setOffline + restore) → verificar que reconecta y sigue recibiendo eventos |

**Cómo testear con dos pestañas en Playwright:**

```ts
// Abrir segunda pestaña en el mismo contexto
const pageA = await context.newPage();
const pageB = await context.newPage();

await pageA.goto('/ingredients');
await pageB.goto('/ingredients');

// Editar en A
await pageA.fill('[data-testid="ingredient-name-01TEST_HARINA"]', 'Harina integral');
await pageA.waitForSelector('[data-testid="save-indicator"][data-state="idle"]');

// Verificar en B (esperar hasta 2s)
await expect(pageB.locator('[data-testid="ingredient-name-01TEST_HARINA"]'))
  .toHaveValue('Harina integral', { timeout: 2000 });
```

### 5.8 PWA — `pwa.spec.ts`

| Test | Descripción |
|------|-------------|
| **Manifest válido** | Verificar que `/manifest.json` existe, tiene `name`, `icons`, `start_url`, `display: standalone` |
| **Service Worker registrado** | Abrir app → verificar que SW está activo (`navigator.serviceWorker.ready`) |
| **Assets cacheados** | Cargar app → cortar red → recargar → la app carga (shell renderiza) |
| **Viewport mobile** | En viewport Pixel 7: navegación usable, formularios accesibles, no hay overflow horizontal |

---

## 6. Datos de prueba (seed)

```sql
-- e2e/fixtures/seed.sql

-- Ingredientes con precios conocidos para cálculos deterministas
-- pkg_price en céntimos (120 = 1.20€)
INSERT INTO ingredients (id, name, pkg_size, pkg_unit, pkg_price, created_at, updated_at) VALUES
  ('01TEST_HARINA', 'Harina de trigo', 1000, 'g', 120, '2025-01-01T00:00:00.000', '2025-01-01T00:00:00.000'),
  ('01TEST_LECHE',  'Leche entera',    1,    'l', 100, '2025-01-01T00:00:00.000', '2025-01-01T00:00:00.000'),
  ('01TEST_HUEVOS', 'Huevos',          12,   'u', 240, '2025-01-01T00:00:00.000', '2025-01-01T00:00:00.000'),
  ('01TEST_MANTEQ', 'Mantequilla',     250,  'g', 250, '2025-01-01T00:00:00.000', '2025-01-01T00:00:00.000'),
  ('01TEST_AZUCAR', 'Azúcar',          1,    'kg', 90, '2025-01-01T00:00:00.000', '2025-01-01T00:00:00.000');

-- Receta: Bizcocho base (genera 1kg, coste = sum de ingredientes)
INSERT INTO recipes (id, name, yield_amount, yield_unit, created_at, updated_at) VALUES
  ('01TEST_BIZCOCHO', 'Bizcocho base', 1, 'kg', '2025-01-01T00:00:00.000', '2025-01-01T00:00:00.000');

INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES
  ('01TEST_BIZCOCHO', '01TEST_HARINA', 300, 'g'),   -- round(120/1000 * 300) = 36 cents
  ('01TEST_BIZCOCHO', '01TEST_HUEVOS', 4,   'u'),   -- round(240/12 * 4) = 80 cents
  ('01TEST_BIZCOCHO', '01TEST_MANTEQ', 150, 'g'),   -- round(250/250 * 150) = 150 cents
  ('01TEST_BIZCOCHO', '01TEST_AZUCAR', 200, 'g');   -- round(90/1000 * 200) = 18 cents
  -- Total: 36 + 80 + 150 + 18 = 284 cents (2.84€)

-- Plato: Tarta cumpleaños (18 PAX, multiplicador 3)
INSERT INTO dishes (id, name, pax, delivery_date, notes, multiplier, created_at, updated_at) VALUES
  ('01TEST_TARTA', 'Tarta cumpleaños', 18, '2025-06-15', 'Sin frutos secos', 3, '2025-01-01T00:00:00.000', '2025-01-01T00:00:00.000');

INSERT INTO dish_ingredients (dish_id, ingredient_id, amount, unit) VALUES
  ('01TEST_TARTA', '01TEST_LECHE', 500, 'ml');  -- round(100/1000 * 500) = 50 cents

INSERT INTO dish_recipes (dish_id, recipe_id, amount, unit) VALUES
  ('01TEST_TARTA', '01TEST_BIZCOCHO', 750, 'g');  -- round(284/1000 * 750) = 213 cents
  -- baseCost = 50 + 213 = 263 cents (2.63€)
  -- finalPrice = 263 * 3 = 789 cents (7.89€)

-- Plato sin fecha (para verificar ordenación)
INSERT INTO dishes (id, name, pax, delivery_date, notes, multiplier, created_at, updated_at) VALUES
  ('01TEST_SINFE', 'Pedido pendiente', 6, NULL, '', 2, '2025-01-01T00:00:00.000', '2025-01-01T00:00:00.000');
```

---

## 7. Endpoint de testing (`/__test/*`)

El backend expone rutas de testing **solo en desarrollo**:

```ts
// Solo registrar si env es dev
if (env.ENVIRONMENT === 'development') {
  app.post('/api/__test/reset', async (c) => {
    // Drop all tables + re-run migrations
    await c.env.DB.exec(MIGRATION_SQL);
    return c.json({ ok: true });
  });

  app.post('/api/__test/seed', async (c) => {
    const sql = await c.req.text();
    await c.env.DB.exec(sql);
    return c.json({ ok: true });
  });
}
```

---

## 8. Scripts npm

```jsonc
// package.json (root)
{
  "scripts": {
    "test": "pnpm test:unit && pnpm test:e2e",
    "test:unit": "pnpm --filter @soliluna/shared test",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:mobile": "playwright test --project=mobile"
  }
}
```

---

## 9. CI (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install
      - run: pnpm test:unit
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e --project=chromium
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 10. Resumen de cobertura

| Área | Tipo de test | Nº tests aprox |
|------|-------------|:--------------:|
| Conversión de unidades | Unit (vitest) | ~10 |
| Cálculo de costes | Unit (vitest) | ~8 |
| CRUD Ingredientes | E2E (playwright) | ~8 |
| CRUD Recetas | E2E (playwright) | ~8 |
| CRUD Platos | E2E (playwright) | ~9 |
| Cálculos E2E | E2E (playwright) | ~6 |
| Auto-save | E2E (playwright) | ~5 |
| Offline/sync | E2E (playwright) | ~6 |
| Real-time SSE | E2E (playwright) | ~6 |
| PWA | E2E (playwright) | ~4 |
| **Total** | | **~70** |

Los tests de cálculo de costes se cubren tanto con unit tests (lógica pura en `shared`) como con E2E (verificar que la UI muestra los valores correctos). Esta redundancia es intencionada: los unit tests son rápidos y precisos, los E2E verifican la integración completa.
