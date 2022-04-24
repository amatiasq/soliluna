import * as yup from 'yup';
import { IngredientId } from './Ingredient';
import { Unit } from './Unit';

export type RecipeId = `snowflake RecipeId`;

export interface Recipe {
  id: RecipeId;
  name: string;
  pax: number;
  cost: number;
  ingredients: {
    id: IngredientId;
    name: string;
    cost: number;
    amount: number;
    unit: Unit;
  }[];
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
