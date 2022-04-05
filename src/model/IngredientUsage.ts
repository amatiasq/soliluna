import * as yup from 'yup';
import {
  calculateIngredientCost,
  Ingredient,
  IngredientId,
} from './Ingredient';
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

export function calculateIngredientsCost(
  ingredients: IngredientUsage[],
  all: Ingredient[]
): number {
  for (const ingredient of ingredients) {
    const match = all.find((x) => x.id === ingredient.id);

    ingredient.cost = calculateIngredientCost(
      match,
      ingredient.amount,
      ingredient.unit
    );
  }

  return ingredients.reduce((sum, x) => sum + x.cost, 0);
}
