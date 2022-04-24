import { mutable } from '../util/mutable';

export const Unit = mutable(['l', 'ml', 'kg', 'g', 'mg', 'u'] as const);
export type Unit = typeof Unit[number];

export function getConversionsFor(unit: Unit): Unit[] {
  switch (unit) {
    case 'l':
    case 'ml':
      return ['l', 'ml'];
    case 'kg':
    case 'g':
    case 'mg':
      return ['kg', 'g', 'mg'];
    case 'u':
      return ['u'];
  }
}

const conversions = {
  l: {
    ml: 1000,
  },
  ml: {
    l: 0.001,
  },
  kg: {
    g: 1000,
    mg: 1000000,
  },
  g: {
    kg: 0.001,
    mg: 1000,
  },
  mg: {
    kg: 0.000001,
    g: 0.001,
  },
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
