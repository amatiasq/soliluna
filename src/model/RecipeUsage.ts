import * as yup from 'yup';
import { Recipe } from './Recipe';
import { RecipeUnit } from './RecipeUnit';

export interface RecipeUsage extends Omit<Recipe, 'ingredients'> {}

export const recipeUsageSchema = yup.object().shape({
  id: yup.string().required(),
  name: yup.string().required(),
  amount: yup.number().required(),
  unit: yup.string().oneOf(RecipeUnit),
  cost: yup.number().required(),
});
