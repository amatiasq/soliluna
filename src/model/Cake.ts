import * as yup from 'yup';
import { Multipliers } from './Multipliers';
import { RecipeId } from './Recipe';

export type CakeId = `snowflake CakeId`;

export interface Cake {
  id: CakeId;
  name: string;
  pax: number;
  cost: number;
  multiplier: Multipliers;
  recipes: {
    id: RecipeId;
    name: string;
    pax: number;
    cost: number;
  }[];
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
          pax: yup.number().required(),
          cost: yup.number().required(),
        })
        .required()
    )
    .required(),
});
