import * as yup from 'yup';
import { IngredientUsage, ingredientUsageSchema } from './IngredientUsage';
import { RecipeUnit } from './RecipeUnit';

export type RecipeId = `snowflake RecipeId`;

export interface Recipe {
  id: RecipeId;
  name: string;
  amount: number;
  unit: RecipeUnit;
  cost: number;
  ingredients: IngredientUsage[];
}

export const recipeSchema = yup.object().shape({
  name: yup.string().required(),
  amount: yup.number().required(),
  unit: yup.string().oneOf(RecipeUnit).required(),
  cost: yup.number().required(),
  ingredients: yup.array().of(ingredientUsageSchema.required()).required(),
});

export function calculateRecipeCost(recipe: Recipe, amount: number): number {
  return recipe.amount ? (recipe.cost / recipe.amount) * amount : 0;
}
