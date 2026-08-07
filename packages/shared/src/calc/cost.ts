import type { Ingredient, IngredientUsage } from '../model/ingredient.ts';
import type { Recipe } from '../model/recipe.ts';
import type { Unit } from '../model/units.ts';
import { convert } from './conversion.ts';

/** `null` = no calculable: pasar de ml a g exige una densidad que no se guarda. */
export function calculateIngredientCost(
  ingredient: Ingredient,
  amount: number,
  unit: Unit,
): number | null {
  if (amount <= 0) return 0;

  try {
    const convertedAmount = convert(amount, unit, ingredient.pkgUnit);
    const pricePerUnit = ingredient.pkgPrice / ingredient.pkgSize;
    return Math.round(pricePerUnit * convertedAmount);
  } catch {
    return null;
  }
}

/** Las filas `null` cuentan como cero: con `missing > 0` el total va por debajo. */
export function resolveIngredientCosts(
  usages: IngredientUsage[],
  catalog: Ingredient[],
): {
  resolved: Array<IngredientUsage & { name: string; cost: number | null }>;
  total: number;
  missing: number;
} {
  let total = 0;
  let missing = 0;

  const resolved = usages.map((usage) => {
    const ingredient = catalog.find((i) => i.id === usage.ingredientId);
    const name = ingredient ? ingredient.name : '(desconocido)';
    const cost = ingredient
      ? calculateIngredientCost(ingredient, usage.amount, usage.unit)
      : null;

    if (cost === null) missing++;
    else total += cost;

    return { ...usage, name, cost };
  });

  return { resolved, total, missing };
}

export function calculateRecipeCost(
  recipe: Pick<Recipe, 'yieldAmount' | 'cost'>,
  amount: number,
): number {
  if (recipe.yieldAmount <= 0 || amount <= 0) return 0;
  return Math.round((recipe.cost / recipe.yieldAmount) * amount);
}

export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}
