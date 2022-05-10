import { z } from 'zod';
import { IngredientUsage } from './IngredientUsage';
import { Multipliers } from './Multipliers';
import { RecipeUsage } from './RecipeUsage';

export type CakeId = `snowflake CakeId`;

export interface Cake {
  id: CakeId;
  name: string;
  pax: number;
  cost: number;
  multiplier: Multipliers;
  recipes: RecipeUsage[];
  ingredients: IngredientUsage[];
}

export const Cake: z.ZodType<Omit<Cake, 'id' | 'multiplier'>> = z.object({
  name: z.string(),
  pax: z.number(),
  cost: z.number(),
  multiplier: z.enum(Multipliers as any),
  recipes: z.array(RecipeUsage),
  ingredients: z.array(IngredientUsage),
});