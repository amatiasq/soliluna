import * as yup from 'yup';
import { Ingredient, IngredientId } from './Ingredient';
import { smallestUnit, Unit } from './Unit';

export interface IngredientUsage {
  id: IngredientId;
  name: string;
  cost: number;
  amount: number;
  unit: Unit;
}

export const ingredientUsageSchema = yup.object().shape({
  id: yup.string().required(),
  name: yup.string().required(),
  cost: yup.number().required(),
  amount: yup.number().required(),
  unit: yup.string().oneOf(Unit).required(),
});

export function ingredientToUsage(ingredient: Ingredient): IngredientUsage {
  return {
    id: ingredient.id,
    name: ingredient.name,
    cost: 0,
    amount: '' as any,
    unit: smallestUnit(ingredient.pkgUnit),
  };
}
