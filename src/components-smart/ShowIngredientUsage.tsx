import { Checkbox, Grid, Text } from '@chakra-ui/react';
import React, { Fragment } from 'react';
import { IngredientUsage } from '../model/IngredientUsage';
import { printUnit } from '../model/Unit';

interface ShowIngredientUsageProps {
  ingredients: IngredientUsage[];
  amountModifier: (amount: number) => number;
}

export function ShowIngredientUsage({
  ingredients,
  amountModifier = (x) => x,
}: ShowIngredientUsageProps) {
  return (
    <Grid templateColumns="1fr auto 1fr" gap="var(--chakra-space-2)">
      {ingredients.map((ingredient, index) => (
        <Fragment key={`${ingredient.id}-${index}`}>
          <Text textAlign="right">
            {printUnit(amountModifier(ingredient.amount), ingredient.unit)}
          </Text>
          <Checkbox checked={false} />
          <Text>{ingredient.name}</Text>
        </Fragment>
      ))}
    </Grid>
  );
}
