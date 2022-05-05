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
import { Recipe, RecipeId } from '../model/Recipe';
import { RecipeUsage } from '../model/RecipeUsage';
import { printUnit } from '../model/Unit';
import { focusNextInput } from '../util/focusNextInput';

export interface RequiredRecipesProps {
  gridArea?: string;
  pax: number;
}

const RecipeControl = bindControl<RecipeUsage, `recipes.${number}.`>();

export function RequiredRecipes({ gridArea, pax }: RequiredRecipesProps) {
  const { data, isLoading } = useFireList<Recipe>('recetas', {
    orderBy: 'name',
  });

  if (isLoading) {
    return <Loading />;
  }

  const getRecipe = (id: RecipeId) => data.find((x) => x.id === id)!;
  const names = data.map((x) => ({ value: x.id, label: x.name }));
  const [{ ingredients, ...defaultRecipe }] = data;

  return (
    <FormList<RecipeUsage>
      gridArea={gridArea}
      gap={['var(--chakra-space-6)', 'var(--chakra-space-2)']}
      name="recipes"
      label="Recetas"
      addLabel="Añadir receta"
      addItem={() => defaultRecipe}
    >
      {({ index, item, remove }) => {
        const recipe = getRecipe(item.id);

        if (!recipe) {
          remove();
          return null;
        }

        const changed = item.name !== recipe.name;

        if (changed) {
          item.name = recipe.name;
          item.amount = recipe.amount;
          item.unit = recipe.unit;
        }

        const isPax = item.unit === 'PAX';

        if (isPax) {
          item.amount = pax;
        }

        item.cost = recipe.amount
          ? (recipe.cost / recipe.amount) * item.amount
          : 0;

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
              onChange={focusNextInput}
            />

            <InputGroup gridArea="quantity">
              <RecipeControl
                name={`recipes.${index}.amount`}
                as={NumberInput}
                isReadOnly={isPax}
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
