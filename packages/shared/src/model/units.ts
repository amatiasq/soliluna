import { z } from 'zod';

// -- Unidades de ingredientes --

export const Unit = ['l', 'ml', 'kg', 'g', 'u'] as const;
export type Unit = (typeof Unit)[number];
export const UnitSchema = z.enum(Unit);

// -- Unidades de recetas --

export const RecipeUnit = ['PAX', 'kg', 'g'] as const;
export type RecipeUnit = (typeof RecipeUnit)[number];
export const RecipeUnitSchema = z.enum(RecipeUnit);

// -- Multiplicadores de precio --

export const Multiplier = [1, 2, 3, 4, 5, 6] as const;
export type Multiplier = (typeof Multiplier)[number];
export const MultiplierSchema = z.enum(
  Multiplier.map(String) as [string, ...string[]],
).transform(Number) as unknown as z.ZodType<Multiplier>;

// -- Cantidad genérica (valor + unidad) --

export const QuantitySchema = z.object({
  amount: z.number().positive(),
  unit: UnitSchema,
});
export type Quantity = z.infer<typeof QuantitySchema>;

export const RecipeQuantitySchema = z.object({
  amount: z.number().positive(),
  unit: RecipeUnitSchema,
});
export type RecipeQuantity = z.infer<typeof RecipeQuantitySchema>;
