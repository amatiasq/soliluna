import {
  Checkbox,
  Grid,
  GridItem,
  Input,
  InputGroup,
  InputRightAddon,
  InputRightElement,
  Text,
} from '@chakra-ui/react';
import React from 'react';
import { bindControl } from '../components/Control';
import { DeleteButton } from '../components/DeleteButton';
import { Dropdown } from '../components/Dropdown';
import { FormList } from '../components/FormList';
import { Loading } from '../components/Loading';
import { NumberInput } from '../components/NumberInput';
import { useFireList } from '../hooks/useFireList';
import { Ingredient } from '../model/Ingredient';
import { calculateIngredientsCost } from '../model/IngredientUsage';
import { calculateRecipeCost, Recipe, RecipeId } from '../model/Recipe';
import { RecipeUsage } from '../model/RecipeUsage';
import { printUnit } from '../model/Unit';
import { focusNextInput } from '../util/focusNextInput';
import { unkonwnEntity } from '../util/unknownEntity';

export interface RequiredRecipesProps {
  gridArea?: string;
  pax: number;
}

const RecipeControl = bindControl<RecipeUsage, `recipes.${number}.`>();

export function RequiredRecipes({ gridArea, pax }: RequiredRecipesProps) {
  const { data, isLoading } = useFireList<Recipe>('recetas', {
    orderBy: 'name',
  });
  const ingredients = useFireList<Ingredient>('ingredientes', {
    orderBy: 'name',
  });

  if (isLoading || ingredients.isLoading) {
    return <Loading />;
  }

  const getRecipe = (id: RecipeId) => data.find((x) => x.id === id)!;
  const names = data.map((x) => ({ value: x.id, label: x.name }));
  const [{ ingredients: _, ...defaultRecipe }] = data;

  return (
    <FormList<RecipeUsage>
      gridArea={gridArea}
      gap={['var(--chakra-space-6)', 'var(--chakra-space-2)']}
      name="recipes"
      label="Recetas"
      addLabel="Añadir receta"
      addItem={() => defaultRecipe}
    >
      {({ index, item, all, remove }) => {
        const recipe = getRecipe(item.id);
        const isDuplicated = all.some((x) => x !== item && x.id === item.id);

        if (!recipe) {
          unkonwnEntity('receta desconocida', item);
          remove();
          return null;
        }

        recipe.cost = calculateIngredientsCost(
          recipe.ingredients,
          ingredients.data
        );

        item.cost = calculateRecipeCost(recipe, item.amount);

        return (
          <Grid
            key={index}
            gap="var(--chakra-space-2)"
            gridTemplate={[
              `
                "name name name"
                "quantity cost remove"
                "ingredients ingredients ingredients"
                / 8fr 7fr auto
              `,
              `
                "name quantity cost remove"
                "ingredients ingredients ingredients ingredients"
                / 1fr 8rem 7rem auto
              `,
            ]}
          >
            <RecipeControl
              gridArea="name"
              name={`recipes.${index}.id`}
              as={Dropdown}
              options={names}
              isInvalid={isDuplicated}
              onChange={(FACU) => {
                const newRecipe = getRecipe(FACU.target.id as RecipeId);
                item.name = newRecipe.name;
                item.amount = newRecipe.amount;
                item.unit = newRecipe.unit;
                focusNextInput(FACU);
              }}
            />

            <InputGroup gridArea="quantity">
              <RecipeControl
                name={`recipes.${index}.amount`}
                as={NumberInput}
              />
              <InputRightElement width="4rem">
                <Input value={item.unit} isReadOnly />
              </InputRightElement>
            </InputGroup>

            <InputGroup gridArea="cost">
              <Input value={item.cost.toFixed(2)} isReadOnly />
              <InputRightAddon>€</InputRightAddon>
            </InputGroup>

            <DeleteButton
              gridArea="remove"
              label={`Quitar ${item.name}`}
              onConfirm={remove}
            />

            <GridItem gridArea="ingredients">
              {recipe.ingredients.map((ingredient) => (
                <Grid
                  key={ingredient.id}
                  templateColumns="1fr auto 1fr"
                  gap="var(--chakra-space-2)"
                >
                  <Text textAlign="right">
                    {printUnit(
                      (ingredient.amount / recipe.amount) * item.amount,
                      ingredient.unit
                    )}
                  </Text>
                  <Checkbox checked={false} />
                  <Text>{ingredient.name}</Text>
                </Grid>
              ))}
            </GridItem>
          </Grid>
        );
      }}
    </FormList>
  );
}
