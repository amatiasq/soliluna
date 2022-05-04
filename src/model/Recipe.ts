import * as yup from 'yup';
import { RequiredIngredient } from '../components-smart/RequiredIngredients';
import { Ingredient } from './Ingredient';
import { RecipeUnit } from './RecipeUnit';
import { Unit } from './Unit';

export type RecipeId = `snowflake RecipeId`;

export interface Recipe {
  id: RecipeId;
  name: string;
  amount: number;
  unit: RecipeUnit;
  cost: number;
  ingredients: RequiredIngredient[];
}

export const recipeSchema = yup.object().shape({
  name: yup.string().required(),
  pax: yup.number().required(),
  cost: yup.number().required(),
  ingredients: yup
    .array()
    .of(
      yup
        .object()
        .shape({
          id: yup.string().required(),
          name: yup.string().required(),
          cost: yup.number().required(),
          amount: yup.number().required(),
          unit: yup.string().oneOf(Unit).required(),
        })
        .required()
    )
    .required(),
});

export function ingredientToRecipe(ingredient: Ingredient) {
  return {
    id: ingredient.id,
    name: ingredient.name,
    cost: ingredient.pkgPrice,
    amount: ingredient.pkgSize,
    unit: ingredient.pkgUnit,
  };
}
