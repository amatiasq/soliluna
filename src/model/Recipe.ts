import { z } from 'zod';
import { IngredientUsage } from './IngredientUsage';
import { RecipeUnit } from './RecipeUnit';

export type RecipeId = `snowflake RecipeId`;
export const RecipeId = z.string() as any as z.ZodEnum<[RecipeId]>;

export interface Recipe {
  id: RecipeId;
  name: string;
  amount: number;
  unit: RecipeUnit;
  cost: number;
  ingredients: IngredientUsage[];
}

export const Recipe: z.ZodType<Omit<Recipe, 'id'>> = z.object({
  name: z.string(),
  amount: z.number(),
  unit: z.enum(RecipeUnit),
  cost: z.number(),
  ingredients: z.array(IngredientUsage),
});

export function calculateRecipeCost(recipe: Recipe, amount: number): number {
  return recipe.amount ? (recipe.cost / recipe.amount) * amount : 0;
}
