import { Box, Checkbox, Grid, HStack, Text } from '@chakra-ui/react';
import React, { Fragment } from 'react';
import {
  calculateIngredientWeight,
  IngredientUsage,
} from '../model/IngredientUsage';
import { printUnit } from '../model/Unit';

interface ShowIngredientUsageProps {
  ingredients: IngredientUsage[];
  amountModifier: (amount: number) => number;
}

export function ShowIngredientUsage({
  ingredients,
  amountModifier = (x) => x,
}: ShowIngredientUsageProps) {
  const weight = ingredients.reduce(
    (sum, ingredient) =>
      sum + calculateIngredientWeight(ingredient, amountModifier),
    0
  );

  return (
    <HStack>
      <Grid templateColumns="1fr auto 1fr" gap="var(--chakra-space-2)" flex={1}>
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
      <Box>
        <Text>Total</Text>
        <Text>{printUnit(weight, 'g')}</Text>
      </Box>
    </HStack>
  );
}
