import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import { IngredientUsage } from './IngredientUsage';
import { Multipliers } from './Multipliers';
import { RecipeUsage } from './RecipeUsage';

export type CakeId = `snowflake CakeId`;

export interface Cake {
  id: CakeId;
  name: string;
  pax: number;
  date?: Timestamp;
  notes?: string;
  cost: number;
  multiplier: Multipliers;
  recipes: RecipeUsage[];
  ingredients: IngredientUsage[];
}

export const Cake: z.ZodType<Omit<Cake, 'id' | 'multiplier'>> = z.object({
  name: z.string(),
  pax: z.number(),
  date: z.instanceof(Timestamp).optional(),
  notes: z.string().optional(),
  cost: z.number(),
  multiplier: z.any(), // z.enum(Multipliers as any),
  recipes: z.array(RecipeUsage),
  ingredients: z.array(IngredientUsage),
});
