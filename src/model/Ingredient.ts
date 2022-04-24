import * as yup from 'yup';
import { Unit } from './Unit';

export type IngredientId = `snowflake IngredientId`;

export interface Ingredient {
  id: IngredientId;
  name: string;
  pkgSize: number;
  pkgUnit: Unit;
  pkgPrice: number;
}

export const ingredientSchema = yup.object().shape({
  name: yup.string().required(),
  pkgSize: yup.number().positive().required(),
  pkgUnit: yup.string().oneOf(Unit).required(),
  pkgPrice: yup.number().positive().required(),
});
