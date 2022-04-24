import { mutable } from '../util/mutable';

export const Multipliers = mutable([1, 2, 3, 4, 5, 6] as const);
export type Multipliers = typeof Multipliers[number];

export const multiplierOptions = Multipliers.map((x) => ({
  value: x,
  label: `x${x}`,
}));
