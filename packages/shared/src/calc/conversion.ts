import type { Unit } from '../model/units.ts';

/** A unidad base: ml para volumen, g para peso. `u` no convierte. */
const TO_BASE: Record<string, number> = {
  ml: 1,
  l: 1000,
  g: 1,
  kg: 1000,
};

const VOLUME: Unit[] = ['l', 'ml'];
const WEIGHT: Unit[] = ['kg', 'g'];

function sameFamily(a: Unit, b: Unit): boolean {
  if (VOLUME.includes(a) && VOLUME.includes(b)) return true;
  if (WEIGHT.includes(a) && WEIGHT.includes(b)) return true;
  if (a === 'u' && b === 'u') return true;
  return false;
}

/** Lanza si las unidades no son de la misma familia. */
export function convert(amount: number, from: Unit, to: Unit): number {
  if (from === to) return amount;

  if (!sameFamily(from, to)) {
    throw new Error(`Cannot convert ${from} to ${to}: incompatible units`);
  }

  if (from === 'u' || to === 'u') return amount;

  const baseAmount = amount * TO_BASE[from];
  return baseAmount / TO_BASE[to];
}
