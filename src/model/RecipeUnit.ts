import { mutable } from '../util/mutable';

export const RecipeUnit = mutable(['PAX', 'kg', 'g'] as const);
export type RecipeUnit = typeof RecipeUnit[number];
