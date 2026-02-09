-- Ingredientes
CREATE TABLE IF NOT EXISTS ingredients (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  pkg_size   REAL NOT NULL CHECK(pkg_size > 0),
  pkg_unit   TEXT NOT NULL CHECK(pkg_unit IN ('l','ml','kg','g','u')),
  pkg_price  INTEGER NOT NULL CHECK(pkg_price >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now'))
);
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
CREATE INDEX IF NOT EXISTS idx_ingredients_updated ON ingredients(updated_at);

-- Recetas
CREATE TABLE IF NOT EXISTS recipes (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  yield_amount REAL NOT NULL CHECK(yield_amount > 0),
  yield_unit   TEXT NOT NULL CHECK(yield_unit IN ('PAX','kg','g')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now'))
);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);
CREATE INDEX IF NOT EXISTS idx_recipes_updated ON recipes(updated_at);

-- Ingredientes de receta (M:N)
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  recipe_id     TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  amount        REAL NOT NULL CHECK(amount > 0),
  unit          TEXT NOT NULL CHECK(unit IN ('l','ml','kg','g','u')),
  PRIMARY KEY (recipe_id, ingredient_id)
);
CREATE INDEX IF NOT EXISTS idx_ri_ingredient ON recipe_ingredients(ingredient_id);

-- Platos
CREATE TABLE IF NOT EXISTS dishes (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  pax           INTEGER NOT NULL CHECK(pax > 0),
  delivery_date TEXT,
  notes         TEXT DEFAULT '',
  multiplier    INTEGER NOT NULL DEFAULT 1 CHECK(multiplier BETWEEN 1 AND 6),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now'))
);
CREATE INDEX IF NOT EXISTS idx_dishes_delivery ON dishes(delivery_date);
CREATE INDEX IF NOT EXISTS idx_dishes_updated ON dishes(updated_at);

-- Ingredientes directos de plato (M:N)
CREATE TABLE IF NOT EXISTS dish_ingredients (
  dish_id       TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  amount        REAL NOT NULL CHECK(amount > 0),
  unit          TEXT NOT NULL CHECK(unit IN ('l','ml','kg','g','u')),
  PRIMARY KEY (dish_id, ingredient_id)
);
CREATE INDEX IF NOT EXISTS idx_di_ingredient ON dish_ingredients(ingredient_id);

-- Recetas usadas en plato (M:N)
CREATE TABLE IF NOT EXISTS dish_recipes (
  dish_id   TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
  amount    REAL NOT NULL CHECK(amount > 0),
  unit      TEXT NOT NULL CHECK(unit IN ('PAX','kg','g')),
  PRIMARY KEY (dish_id, recipe_id)
);
CREATE INDEX IF NOT EXISTS idx_dr_recipe ON dish_recipes(recipe_id);

-- Registro de eliminaciones para sincronización offline
CREATE TABLE IF NOT EXISTS deletions (
  entity     TEXT NOT NULL,
  entity_id  TEXT NOT NULL,
  deleted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now')),
  PRIMARY KEY (entity, entity_id)
);
