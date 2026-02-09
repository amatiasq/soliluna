-- Ingredientes con precios conocidos para cálculos deterministas
-- pkg_price en céntimos (120 = 1.20€)
INSERT INTO ingredients (id, name, pkg_size, pkg_unit, pkg_price, created_at, updated_at) VALUES
  ('01TEST_HARINA', 'Harina de trigo', 1000, 'g', 120, '2025-01-01T00:00:00.000', '2025-01-01T00:00:00.000'),
  ('01TEST_LECHE',  'Leche entera',    1,    'l', 100, '2025-01-01T00:00:00.000', '2025-01-01T00:00:00.000'),
  ('01TEST_HUEVOS', 'Huevos',          12,   'u', 240, '2025-01-01T00:00:00.000', '2025-01-01T00:00:00.000'),
  ('01TEST_MANTEQ', 'Mantequilla',     250,  'g', 250, '2025-01-01T00:00:00.000', '2025-01-01T00:00:00.000'),
  ('01TEST_AZUCAR', 'Azúcar',          1,    'kg', 90, '2025-01-01T00:00:00.000', '2025-01-01T00:00:00.000'),
  ('01TEST_CANELA', 'Canela',          100,  'g',  350, '2025-01-01T00:00:00.000', '2025-01-01T00:00:00.000');

-- Receta: Bizcocho base (genera 1kg)
-- Coste: 36 + 80 + 150 + 18 = 284 cents (2.84€)
INSERT INTO recipes (id, name, yield_amount, yield_unit, created_at, updated_at) VALUES
  ('01TEST_BIZCOCHO', 'Bizcocho base', 1, 'kg', '2025-01-01T00:00:00.000', '2025-01-01T00:00:00.000');

INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES
  ('01TEST_BIZCOCHO', '01TEST_HARINA', 300, 'g'),
  ('01TEST_BIZCOCHO', '01TEST_HUEVOS', 4,   'u'),
  ('01TEST_BIZCOCHO', '01TEST_MANTEQ', 150, 'g'),
  ('01TEST_BIZCOCHO', '01TEST_AZUCAR', 200, 'g');

-- Receta sin uso en platos (para probar eliminación)
INSERT INTO recipes (id, name, yield_amount, yield_unit, created_at, updated_at) VALUES
  ('01TEST_GALLETAS', 'Galletas test', 1, 'kg', '2025-01-01T00:00:00.000', '2025-01-01T00:00:00.000');

-- Plato: Tarta cumpleaños (18 PAX, multiplicador 3)
-- baseCost = 50 (leche 500ml) + 213 (bizcocho 0.75kg) = 263 cents, finalPrice = 263 * 3 = 789 cents (7.89€)
INSERT INTO dishes (id, name, pax, delivery_date, notes, multiplier, created_at, updated_at) VALUES
  ('01TEST_TARTA', 'Tarta cumpleaños', 18, '2025-06-15', 'Sin frutos secos', 3, '2025-01-01T00:00:00.000', '2025-01-01T00:00:00.000');

INSERT INTO dish_ingredients (dish_id, ingredient_id, amount, unit) VALUES
  ('01TEST_TARTA', '01TEST_LECHE', 500, 'ml');

INSERT INTO dish_recipes (dish_id, recipe_id, amount, unit) VALUES
  ('01TEST_TARTA', '01TEST_BIZCOCHO', 0.75, 'kg');

-- Plato sin fecha (para verificar ordenación)
INSERT INTO dishes (id, name, pax, delivery_date, notes, multiplier, created_at, updated_at) VALUES
  ('01TEST_SINFE', 'Pedido pendiente', 6, NULL, '', 2, '2025-01-01T00:00:00.000', '2025-01-01T00:00:00.000');
