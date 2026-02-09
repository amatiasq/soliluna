import type { Ingredient, IngredientUsage } from '../model/ingredient.js';
import type { Recipe, RecipeUsage } from '../model/recipe.js';
import type { Unit } from '../model/units.js';
import { convert } from './conversion.js';

/**
 * Calcula el coste (en céntimos) de usar una cantidad de un ingrediente.
 *
 * Fórmula: round((precio_paquete_cents / tamaño_paquete) × cantidad_convertida)
 *
 * Ejemplo: Harina a 120 cents/kg (1.20€), usar 500g:
 *   round((120 / 1000) × 500) = round(60) = 60 cents (0.60€)
 *
 * Ejemplo: Huevos a 240 cents/12u (2.40€), usar 4u:
 *   round((240 / 12) × 4) = round(80) = 80 cents (0.80€)
 */
export function calculateIngredientCost(
  ingredient: Ingredient,
  amount: number,
  unit: Unit,
): number {
  if (amount <= 0) return 0;

  try {
    const convertedAmount = convert(amount, unit, ingredient.pkgUnit);
    const pricePerUnit = ingredient.pkgPrice / ingredient.pkgSize;
    return Math.round(pricePerUnit * convertedAmount);
  } catch {
    // Incompatible units (e.g. ml↔g) — cannot calculate cost
    return -1;
  }
}

/**
 * Calcula el coste total (en céntimos) de una lista de ingredientes usados.
 * Requiere el catálogo completo de ingredientes para resolver IDs.
 *
 * Retorna un array de { ingredientId, amount, unit, name, cost }
 * y el coste total. Todos los costes son enteros en céntimos.
 */
export function resolveIngredientCosts(
  usages: IngredientUsage[],
  catalog: Ingredient[],
): { resolved: Array<IngredientUsage & { name: string; cost: number }>; total: number } {
  let total = 0;

  const resolved = usages.map((usage) => {
    const ingredient = catalog.find((i) => i.id === usage.ingredientId);

    if (!ingredient) {
      return { ...usage, name: '(desconocido)', cost: -1 };
    }

    const cost = calculateIngredientCost(ingredient, usage.amount, usage.unit);
    total += cost;

    return { ...usage, name: ingredient.name, cost };
  });

  return { resolved, total };
}

/**
 * Calcula el coste (en céntimos) de usar una porción de receta en un plato.
 *
 * Ejemplo: Receta "bizcocho" genera 1kg y cuesta 284 cents (2.84€).
 *   Usar 750g: round((284 / 1000) × 750) = round(213) = 213 cents (2.13€)
 */
export function calculateRecipeCost(
  recipe: Pick<Recipe, 'yieldAmount' | 'cost'>,
  amount: number,
): number {
  if (recipe.yieldAmount <= 0 || amount <= 0) return 0;
  return Math.round((recipe.cost / recipe.yieldAmount) * amount);
}

/**
 * Formatea céntimos a string en euros.
 * Ejemplo: 284 → "2.84", 60 → "0.60", 1818 → "18.18"
 */
export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}
