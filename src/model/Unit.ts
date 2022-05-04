import { mutable } from '../util/mutable';

export const Unit = mutable(['l', 'ml', 'kg', 'g', 'u'] as const);
export type Unit = typeof Unit[number];

export function getConversionsFor(unit: Unit): Unit[] {
  switch (unit) {
    case 'l':
    case 'ml':
      return ['l', 'ml'];
    case 'kg':
    case 'g':
      return ['kg', 'g'];
    case 'u':
      return ['u'];
  }
}

const conversions = {
  l: { ml: 1000 },
  ml: { l: 0.001 },
  kg: { g: 1000 },
  g: { kg: 0.001 },
};

export function convert(amount: number, source: Unit, target: Unit) {
  if (source === target) return amount;

  try {
    const multiplier = (conversions as any)[source][target];
    return amount * multiplier;
  } catch (error) {
    console.error(`Can't convert from "${source}" to "${target}"`);
    throw error;
  }
}

export function smallestUnit(unit: Unit) {
  const result = getConversionsFor(unit);
  return result.pop()!;
}

export function largestUnit(unit: Unit) {
  const result = getConversionsFor(unit);
  return result.shift()!;
}

export function printUnit(value: number, unit: Unit) {
  if ((value < 1 && unit === 'kg') || unit === 'l') {
    value = value * 1000;
    unit = smallestUnit(unit);
  } else if ((value > 1000 && unit === 'g') || unit === 'ml') {
    value = value / 1000;
    unit = largestUnit(unit);
  }

  return `${value.toLocaleString()}${unit}`;
}
