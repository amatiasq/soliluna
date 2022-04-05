import * as yup from 'yup';
import { convert, Unit } from './Unit';

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

export function calculateIngredientCost(
  ingredient: Ingredient | null | undefined,
  amount: number,
  unit: Unit
) {
  if (!ingredient) return -1;
  if (!amount || !unit) return 0;
  const base = convert(amount, unit, ingredient.pkgUnit);
  return (ingredient.pkgPrice / ingredient.pkgSize) * base;
}
