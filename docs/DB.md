# Soliluna v3 — Esquema de Base de Datos (D1 / SQLite)

## 1. Principios

- **SQLite vía Cloudflare D1** — base de datos gestionada, sin servidor propio.
- **Costes calculados, no almacenados** — el coste de una receta se calcula en runtime a partir de los precios de sus ingredientes. Esto evita inconsistencias cuando cambia el precio de un ingrediente.
- **IDs tipo ULID** (TEXT) — generados en el cliente para soportar creación offline.
- **Timestamps ISO 8601** — `created_at` y `updated_at` como TEXT, usados para conflict detection (LWW).
- **Unidades como TEXT con CHECK** — aprovecha la simplicidad de SQLite; evita tabla de lookup innecesaria para un enum pequeño.
- **Precios en céntimos (INTEGER)** — los precios se almacenan como enteros en céntimos (120 = 1.20 €). Esto elimina errores de precisión de punto flotante en operaciones aritméticas. La conversión a euros se hace solo para mostrar en UI.
- **Cantidades como REAL** — SQLite no tiene tipo DECIMAL; REAL (64-bit IEEE 754) es suficiente para las magnitudes de cocina (gramos, litros).

---

## 2. Esquema SQL

```sql
-- ============================================================
-- INGREDIENTES
-- ============================================================
CREATE TABLE ingredients (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  pkg_size   REAL NOT NULL CHECK(pkg_size > 0),
  pkg_unit   TEXT NOT NULL CHECK(pkg_unit IN ('l','ml','kg','g','u')),
  pkg_price  INTEGER NOT NULL CHECK(pkg_price >= 0),  -- céntimos (120 = 1.20€)
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now'))
);

CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_ingredients_updated ON ingredients(updated_at);

-- ============================================================
-- RECETAS
-- ============================================================
CREATE TABLE recipes (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  yield_amount REAL NOT NULL CHECK(yield_amount > 0),
  yield_unit   TEXT NOT NULL CHECK(yield_unit IN ('PAX','kg','g')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now'))
);

CREATE INDEX idx_recipes_name ON recipes(name);
CREATE INDEX idx_recipes_updated ON recipes(updated_at);

-- ============================================================
-- INGREDIENTES DE UNA RECETA (M:N)
-- ============================================================
CREATE TABLE recipe_ingredients (
  recipe_id     TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  amount        REAL NOT NULL CHECK(amount > 0),
  unit          TEXT NOT NULL CHECK(unit IN ('l','ml','kg','g','u')),
  PRIMARY KEY (recipe_id, ingredient_id)
);

CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);

-- ============================================================
-- PLATOS (antes "pasteles")
-- ============================================================
CREATE TABLE dishes (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  pax           INTEGER NOT NULL CHECK(pax > 0),
  delivery_date TEXT,                                  -- ISO 8601 date o NULL
  notes         TEXT DEFAULT '',
  multiplier    INTEGER NOT NULL DEFAULT 1 CHECK(multiplier BETWEEN 1 AND 6),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now'))
);

CREATE INDEX idx_dishes_delivery ON dishes(delivery_date);
CREATE INDEX idx_dishes_updated ON dishes(updated_at);

-- ============================================================
-- INGREDIENTES DIRECTOS DE UN PLATO (M:N)
-- ============================================================
CREATE TABLE dish_ingredients (
  dish_id       TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  amount        REAL NOT NULL CHECK(amount > 0),
  unit          TEXT NOT NULL CHECK(unit IN ('l','ml','kg','g','u')),
  PRIMARY KEY (dish_id, ingredient_id)
);

CREATE INDEX idx_dish_ingredients_ingredient ON dish_ingredients(ingredient_id);

-- ============================================================
-- RECETAS USADAS EN UN PLATO (M:N)
-- ============================================================
CREATE TABLE dish_recipes (
  dish_id   TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
  amount    REAL NOT NULL CHECK(amount > 0),
  unit      TEXT NOT NULL CHECK(unit IN ('PAX','kg','g')),
  PRIMARY KEY (dish_id, recipe_id)
);

CREATE INDEX idx_dish_recipes_recipe ON dish_recipes(recipe_id);
```

---

## 3. Diagrama Entidad-Relación

```
┌──────────────┐       ┌─────────────────────┐       ┌──────────────┐
│  ingredients │       │  recipe_ingredients  │       │   recipes    │
│──────────────│       │─────────────────────│       │──────────────│
│ id       PK  │◄──────│ ingredient_id   FK   │       │ id       PK  │
│ name         │       │ recipe_id       FK   │──────►│ name         │
│ pkg_size     │       │ amount              │       │ yield_amount │
│ pkg_unit     │       │ unit                │       │ yield_unit   │
│ pkg_price    │       └─────────────────────┘       │ created_at   │
│ created_at   │                                     │ updated_at   │
│ updated_at   │       ┌─────────────────────┐       └──────┬───────┘
└──────┬───────┘       │  dish_ingredients   │              │
       │               │─────────────────────│              │
       │               │ ingredient_id   FK   │       ┌──────┴───────────┐
       └──────────────►│ dish_id         FK   │       │  dish_recipes    │
                       │ amount              │       │──────────────────│
                       │ unit                │       │ recipe_id    FK   │
                       └──────────┬──────────┘       │ dish_id      FK   │
                                 │                   │ amount           │
                       ┌─────────▼──────────┐        │ unit             │
                       │      dishes        │        └──────────────────┘
                       │────────────────────│                │
                       │ id            PK   │◄───────────────┘
                       │ name              │
                       │ pax               │
                       │ delivery_date     │
                       │ notes             │
                       │ multiplier        │
                       │ created_at        │
                       │ updated_at        │
                       └────────────────────┘
```

---

## 4. Notas sobre unidades y conversiones

### Unidades de ingredientes (Unit)
| Código | Tipo | Base |
|--------|------|------|
| `l` | Volumen | 1000 ml |
| `ml` | Volumen | 1 ml |
| `kg` | Peso | 1000 g |
| `g` | Peso | 1 g |
| `u` | Unidad/pieza | - (sin conversión) |

### Unidades de recetas (RecipeUnit)
| Código | Significado |
|--------|------------|
| `PAX` | Porciones/personas |
| `kg` | Kilogramos producidos |
| `g` | Gramos producidos |

### Reglas de conversión
- Solo se convierten unidades **del mismo tipo**: `l ↔ ml`, `kg ↔ g`.
- `u` (unidad/pieza) **no se convierte** a peso/volumen (excepto heurísticas como "1 huevo ≈ 65g" que viven en la capa de aplicación, no en la DB).
- `PAX` no se convierte a peso. Un plato con `yield_unit = PAX` se escala linealmente por cantidad de porciones.

### Dónde vive la normalización
La base de datos almacena las cantidades **tal como el usuario las introduce** (ej: `500 ml`, no `0.5 l`). La conversión ocurre en la capa de cálculo (`shared/src/calc/conversion.ts`) cuando se necesita comparar o sumar unidades.

---

## 5. Cálculo de costes (referencia)

El coste **no se almacena en la DB**. Se calcula en runtime. Todos los valores monetarios son **enteros en céntimos**.

```
costeIngredienteEnReceta (céntimos) =
  Math.round(
    (ingrediente.pkg_price / ingrediente.pkg_size)
    × convert(cantidad_usada, unidad_usada, ingrediente.pkg_unit)
  )

costeReceta (céntimos) = Σ costeIngredienteEnReceta (para todos sus ingredientes)

costePlato (céntimos) =
  Σ costes de ingredientes directos
  + Σ Math.round(costeReceta / receta.yield_amount × cantidad_usada) para cada receta

precioFinal (céntimos) = costePlato × plato.multiplier
```

**Nota sobre redondeo:** Se redondea una sola vez al final de cada cálculo atómico (`Math.round`). Como los precios base son enteros, la única fuente de fracciones es la división por `pkg_size` o `yield_amount`. Un solo `Math.round` al final de cada línea de cálculo es suficiente.

**Ventaja:** Si cambias el precio de la harina, todos los costes se recalculan automáticamente sin migración de datos.

---

## 6. Migraciones

Las migraciones viven en `packages/api/src/db/migrations/` y se ejecutan con `wrangler d1 migrations apply`.

```
migrations/
├── 0001_initial.sql       # Schema completo arriba
├── 0002_seed_data.sql     # (opcional) datos iniciales para dev
└── ...
```

Cada migración es un archivo SQL idempotente. Wrangler lleva el control de qué migraciones se han aplicado.

---

## 7. IndexedDB (cliente) — Espejo offline

El cliente mantiene un espejo simplificado en IndexedDB:

| Object Store | Key Path | Contenido |
|-------------|----------|-----------|
| `ingredients` | `id` | `Ingredient[]` — misma forma que la API devuelve |
| `recipes` | `id` | `Recipe[]` — incluye array `ingredients` embebido |
| `dishes` | `id` | `Dish[]` — incluye arrays `ingredients` y `recipes` embebidos |
| `outbox` | auto | `OutboxEntry[]` — `{ id, method, url, body, createdAt }` |
| `meta` | `key` | pares clave-valor: `lastSyncAt`, `dbVersion` |

**Nota:** En IndexedDB almacenamos los datos ya "resueltos" (con ingredientes/recetas embebidos) para evitar joins complejos en el cliente. Esto duplica datos respecto a la DB del servidor, pero simplifica enormemente las lecturas offline.
