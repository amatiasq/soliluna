import { z } from 'zod';
import {
  calculateIngredientCost,
  Ingredient,
  IngredientId,
} from './Ingredient';
import { convert, smallestUnit, Unit } from './Unit';

export interface IngredientUsage {
  id: IngredientId;
  name: string;
  cost: number;
  amount: number;
  unit: Unit;
}

export const IngredientUsage: z.ZodType<IngredientUsage> = z.object({
  id: IngredientId,
  name: z.string(),
  cost: z.number(),
  amount: z.number(),
  unit: z.enum(Unit),
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

export function calculateIngredientWeight(
  ingredient: IngredientUsage,
  amountModifier = (x: number) => x
) {
  const { unit } = ingredient;
  const amount = amountModifier(ingredient.amount);

  if (unit === 'g' || unit === 'ml') return parseFloat(amount as any);

  if (unit === 'kg' || unit === 'l') {
    return convert(amount, 'kg', 'g');
  }

  if (/huevo/i.test(ingredient.name)) {
    return 65 * amount;
  }

  return 0;
}
