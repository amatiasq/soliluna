import { z } from 'zod';
import { IngredientUsageSchema, IngredientUsageResolvedSchema } from './ingredient.js';
import { RecipeUsageSchema, RecipeUsageResolvedSchema } from './recipe.js';

// -- Plato (respuesta API, con todo resuelto) --

export const DishSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  pax: z.number().int().positive(),
  deliveryDate: z.string().nullable(), // ISO 8601 date o null
  notes: z.string().default(''),
  multiplier: z.number().int().min(1).max(6),
  ingredients: z.array(IngredientUsageResolvedSchema),
  recipes: z.array(RecipeUsageResolvedSchema),
  baseCost: z.number().int(),   // céntimos, calculado: sum(ingredientes) + sum(recetas)
  finalPrice: z.number().int(), // céntimos, calculado: baseCost * multiplier
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Dish = z.infer<typeof DishSchema>;

// -- Para crear --

export const DishCreateSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  pax: z.number().int().positive(),
  deliveryDate: z.string().nullable().optional(),
  notes: z.string().optional().default(''),
  multiplier: z.number().int().min(1).max(6).default(1),
});

export type DishCreate = z.infer<typeof DishCreateSchema>;

// -- Para actualizar (metadatos + ingredientes + recetas) --

export const DishUpdateSchema = z.object({
  name: z.string().min(1),
  pax: z.number().int().positive(),
  deliveryDate: z.string().nullable().optional(),
  notes: z.string().optional(),
  multiplier: z.number().int().min(1).max(6),
  ingredients: z.array(IngredientUsageSchema),
  recipes: z.array(RecipeUsageSchema),
  updatedAt: z.string(),
});

export type DishUpdate = z.infer<typeof DishUpdateSchema>;
