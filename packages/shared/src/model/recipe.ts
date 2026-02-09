import { z } from 'zod';
import { RecipeUnitSchema } from './units.js';
import { IngredientUsageSchema, IngredientUsageResolvedSchema } from './ingredient.js';

// -- Receta (respuesta API, con ingredientes y costes resueltos) --

export const RecipeSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  yieldAmount: z.number().positive(),
  yieldUnit: RecipeUnitSchema,
  ingredients: z.array(IngredientUsageResolvedSchema),
  cost: z.number().int(), // céntimos, calculado: suma de costes de ingredientes
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Recipe = z.infer<typeof RecipeSchema>;

// -- Para crear --

export const RecipeCreateSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  yieldAmount: z.number().positive(),
  yieldUnit: RecipeUnitSchema,
});

export type RecipeCreate = z.infer<typeof RecipeCreateSchema>;

// -- Para actualizar (metadatos + ingredientes completos) --

export const RecipeUpdateSchema = z.object({
  name: z.string().min(1),
  yieldAmount: z.number().positive(),
  yieldUnit: RecipeUnitSchema,
  ingredients: z.array(IngredientUsageSchema),
  updatedAt: z.string(),
});

export type RecipeUpdate = z.infer<typeof RecipeUpdateSchema>;

// -- Uso de receta en un plato --

export const RecipeUsageSchema = z.object({
  recipeId: z.string(),
  amount: z.number().positive(),
  unit: RecipeUnitSchema,
});

export type RecipeUsage = z.infer<typeof RecipeUsageSchema>;

// -- Uso de receta con datos resueltos (para respuesta API) --

export const RecipeUsageResolvedSchema = RecipeUsageSchema.extend({
  name: z.string(),
  cost: z.number().int(), // céntimos, coste escalado según la cantidad usada
});

export type RecipeUsageResolved = z.infer<typeof RecipeUsageResolvedSchema>;
