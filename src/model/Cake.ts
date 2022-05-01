import * as yup from 'yup';
import { Multipliers } from './Multipliers';
import { Recipe } from './Recipe';
import { RecipeUnit } from './RecipeUnit';

export type CakeId = `snowflake CakeId`;

export interface Cake {
  id: CakeId;
  name: string;
  pax: number;
  cost: number;
  multiplier: Multipliers;
  recipes: Omit<Recipe, 'ingredients'>[];
  ingredients: Recipe['ingredients'];
}

export const cakeSchema = yup.object().shape({
  name: yup.string().required(),
  pax: yup.number().required(),
  cost: yup.number().required(),
  multiplier: yup.number().oneOf(Multipliers).required(),
  recipes: yup
    .array()
    .of(
      yup
        .object()
        .shape({
          id: yup.string().required(),
          name: yup.string().required(),
          amount: yup.number().required(),
          unit: yup.string().oneOf(RecipeUnit),
          cost: yup.number().required(),
        })
        .required()
    )
    .required(),
});
