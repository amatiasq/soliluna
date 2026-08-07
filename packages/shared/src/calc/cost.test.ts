import { describe, expect, it } from 'vitest';
import type { Ingredient } from '../model/ingredient.ts';
import {
  calculateIngredientCost,
  calculateRecipeCost,
  formatCents,
  resolveIngredientCosts,
} from './cost.ts';

function ingredient(overrides: Partial<Ingredient> & Pick<Ingredient, 'id'>): Ingredient {
  return {
    name: 'ingrediente',
    pkgSize: 1000,
    pkgUnit: 'g',
    pkgPrice: 120,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const HARINA = ingredient({ id: 'harina', name: 'Harina', pkgSize: 1000, pkgUnit: 'g', pkgPrice: 120 });
const HUEVOS = ingredient({ id: 'huevos', name: 'Huevos', pkgSize: 12, pkgUnit: 'u', pkgPrice: 240 });
const LECHE = ingredient({ id: 'leche', name: 'Leche', pkgSize: 1, pkgUnit: 'l', pkgPrice: 95 });
const MIEL = ingredient({ id: 'miel', name: 'Miel', pkgSize: 500, pkgUnit: 'g', pkgPrice: 600 });

describe('calculateIngredientCost', () => {
  it('cobra por la parte usada del paquete', () => {
    // 120 cents/kg, 500 g → (120/1000) × 500
    expect(calculateIngredientCost(HARINA, 500, 'g')).toBe(60);
  });

  it('convierte dentro de la misma familia de unidades', () => {
    // paquete en g, receta en kg
    expect(calculateIngredientCost(HARINA, 0.5, 'kg')).toBe(60);
    // paquete en l, receta en ml
    expect(calculateIngredientCost(LECHE, 200, 'ml')).toBe(19);
  });

  it('cuenta unidades sueltas', () => {
    // 240 cents/12u, 4u → (240/12) × 4
    expect(calculateIngredientCost(HUEVOS, 4, 'u')).toBe(80);
  });

  it('redondea a céntimo entero', () => {
    // (95/1000) × 333 = 31.635
    expect(calculateIngredientCost(LECHE, 333, 'ml')).toBe(32);
  });

  it('devuelve 0 sin cantidad', () => {
    expect(calculateIngredientCost(HARINA, 0, 'g')).toBe(0);
    expect(calculateIngredientCost(HARINA, -5, 'g')).toBe(0);
  });

  it('devuelve null cuando la conversión exigiría densidad', () => {
    // miel comprada al peso, receta en volumen: 50 ml de miel no son 50 g
    expect(calculateIngredientCost(MIEL, 50, 'ml')).toBeNull();
    expect(calculateIngredientCost(LECHE, 200, 'g')).toBeNull();
    expect(calculateIngredientCost(HARINA, 2, 'u')).toBeNull();
  });

  it('nunca devuelve un número negativo, que se leería como precio', () => {
    const cost = calculateIngredientCost(MIEL, 50, 'ml');
    expect(cost === null || cost >= 0).toBe(true);
  });
});

describe('resolveIngredientCosts', () => {
  const catalog = [HARINA, HUEVOS, MIEL];

  it('resuelve nombre y coste de cada uso', () => {
    const { resolved, total, missing } = resolveIngredientCosts(
      [
        { ingredientId: 'harina', amount: 500, unit: 'g' },
        { ingredientId: 'huevos', amount: 4, unit: 'u' },
      ],
      catalog,
    );

    expect(resolved.map((r) => [r.name, r.cost])).toEqual([
      ['Harina', 60],
      ['Huevos', 80],
    ]);
    expect(total).toBe(140);
    expect(missing).toBe(0);
  });

  it('marca la fila no calculable como null y la cuenta en missing', () => {
    const { resolved, total, missing } = resolveIngredientCosts(
      [
        { ingredientId: 'harina', amount: 500, unit: 'g' },
        { ingredientId: 'miel', amount: 50, unit: 'ml' },
      ],
      catalog,
    );

    expect(resolved[1].cost).toBeNull();
    // la fila cuenta como cero: el total es una estimación por debajo, no 59
    expect(total).toBe(60);
    expect(missing).toBe(1);
  });

  it('trata igual al ingrediente que no está en el catálogo', () => {
    const { resolved, total, missing } = resolveIngredientCosts(
      [
        { ingredientId: 'harina', amount: 500, unit: 'g' },
        { ingredientId: 'borrado', amount: 1, unit: 'u' },
      ],
      catalog,
    );

    expect(resolved[1]).toMatchObject({ name: '(desconocido)', cost: null });
    expect(total).toBe(60);
    expect(missing).toBe(1);
  });

  it('cuenta cada fila mala, no solo si hay alguna', () => {
    const { total, missing } = resolveIngredientCosts(
      [
        { ingredientId: 'miel', amount: 50, unit: 'ml' },
        { ingredientId: 'borrado', amount: 1, unit: 'u' },
        { ingredientId: 'harina', amount: 500, unit: 'g' },
      ],
      catalog,
    );

    expect(total).toBe(60);
    expect(missing).toBe(2);
  });

  it('con lista vacía da cero y sin errores', () => {
    expect(resolveIngredientCosts([], catalog)).toEqual({ resolved: [], total: 0, missing: 0 });
  });
});

describe('calculateRecipeCost', () => {
  it('reparte el coste de la receta por la porción usada', () => {
    // bizcocho: 1000 g cuestan 284 cents; usar 750 g
    expect(calculateRecipeCost({ yieldAmount: 1000, cost: 284 }, 750)).toBe(213);
  });

  it('devuelve 0 con rendimiento o cantidad no positivos', () => {
    expect(calculateRecipeCost({ yieldAmount: 0, cost: 284 }, 750)).toBe(0);
    expect(calculateRecipeCost({ yieldAmount: 1000, cost: 284 }, 0)).toBe(0);
  });
});

describe('formatCents', () => {
  it('pasa céntimos a euros con dos decimales', () => {
    expect(formatCents(284)).toBe('2.84');
    expect(formatCents(60)).toBe('0.60');
    expect(formatCents(1818)).toBe('18.18');
    expect(formatCents(0)).toBe('0.00');
  });
});
