import { z } from 'zod';
import { Recipe, RecipeId } from './Recipe';
import { RecipeUnit } from './RecipeUnit';

export interface RecipeUsage extends Omit<Recipe, 'ingredients'> {}

export const RecipeUsage = z.object({
  id: RecipeId,
  name: z.string(),
  amount: z.number(),
  unit: z.enum(RecipeUnit),
  cost: z.number(),
});
