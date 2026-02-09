import { z } from 'zod';
import { UnitSchema, QuantitySchema } from './units.js';

// -- Ingrediente (como se almacena en DB / devuelve la API) --

export const IngredientSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  pkgSize: z.number().positive(),
  pkgUnit: UnitSchema,
  pkgPrice: z.number().int().nonnegative(), // céntimos (120 = 1.20€)
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Ingredient = z.infer<typeof IngredientSchema>;

// -- Para crear (sin id ni timestamps, el id lo genera el cliente) --

export const IngredientCreateSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  pkgSize: z.number().positive(),
  pkgUnit: UnitSchema,
  pkgPrice: z.number().int().nonnegative(), // céntimos
});

export type IngredientCreate = z.infer<typeof IngredientCreateSchema>;

// -- Para actualizar (sin id, con updatedAt para conflict detection) --

export const IngredientUpdateSchema = z.object({
  name: z.string().min(1),
  pkgSize: z.number().positive(),
  pkgUnit: UnitSchema,
  pkgPrice: z.number().int().nonnegative(), // céntimos
  updatedAt: z.string(),
});

export type IngredientUpdate = z.infer<typeof IngredientUpdateSchema>;

// -- Uso de ingrediente en una receta o plato --

export const IngredientUsageSchema = z.object({
  ingredientId: z.string(),
  amount: z.number().positive(),
  unit: UnitSchema,
});

export type IngredientUsage = z.infer<typeof IngredientUsageSchema>;

// -- Uso de ingrediente con datos resueltos (para respuesta API) --

export const IngredientUsageResolvedSchema = IngredientUsageSchema.extend({
  name: z.string(),
  cost: z.number().int(), // céntimos calculados
});

export type IngredientUsageResolved = z.infer<typeof IngredientUsageResolvedSchema>;
