import * as yup from 'yup';
import { IngredientUsage, ingredientUsageSchema } from './IngredientUsage';
import { Multipliers } from './Multipliers';
import { RecipeUsage, recipeUsageSchema } from './RecipeUsage';

export type CakeId = `snowflake CakeId`;

export interface Cake {
  id: CakeId;
  name: string;
  pax: number;
  cost: number;
  multiplier: Multipliers;
  recipes: RecipeUsage[];
  ingredients: IngredientUsage[];
}

export const cakeSchema = yup.object().shape({
  name: yup.string().required(),
  pax: yup.number().required(),
  cost: yup.number().required(),
  multiplier: yup.number().oneOf(Multipliers).required(),
  recipes: yup.array().of(recipeUsageSchema.required()).required(),
  ingredients: yup.array().of(ingredientUsageSchema.required()).required(),
});
