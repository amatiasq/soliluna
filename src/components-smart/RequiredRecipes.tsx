import {
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputRightAddon,
  InputRightElement,
  VStack,
} from '@chakra-ui/react';
import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { bindControl } from '../components/Control';
import { Dropdown } from '../components/Dropdown';
import { FormList } from '../components/FormList';
import { Loading } from '../components/Loading';
import { useFireList } from '../hooks/useFireList';
import { Recipe, RecipeId } from '../model/Recipe';
import { RecipeUsage } from '../model/RecipeUsage';

export interface RequiredRecipesProps {
  pax: number;
}

const RecipeControl = bindControl<RecipeUsage, `recipes.${number}.`>();

export function RequiredRecipes({ pax }: RequiredRecipesProps) {
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
      name="recipes"
      label="Recetas"
      addLabel="Añadir receta"
      addItem={() => defaultRecipe}
      align="stretch"
    >
      {({ index, item, remove }) => {
        const recipe = getRecipe(item.id);

        if (!recipe) {
          remove();
          return null;
        }

        if (item.name !== recipe.name) {
          item.name = recipe.name;
          item.amount = recipe.amount;
          item.unit = recipe.unit;
        }

        if (item.unit === 'PAX') {
          item.amount = pax;
        }

        item.cost = recipe.amount
          ? (recipe.cost / recipe.amount) * item.amount
          : 0;

        return (
          <VStack>
            <HStack key={index}>
              <RecipeControl
                name={`recipes.${index}.id`}
                as={Dropdown}
                options={names}
                autoFocus
              />

              <InputGroup width="25rem">
                <RecipeControl
                  name={`recipes.${index}.amount`}
                  as={Input}
                  isReadOnly={item.unit === 'PAX'}
                />
                <InputRightElement width="4rem">
                  <Input value={item.unit} isReadOnly />
                </InputRightElement>
              </InputGroup>

              <InputGroup>
                <Input value={item.cost.toFixed(2)} isReadOnly />
                <InputRightAddon>€</InputRightAddon>
              </InputGroup>

              <IconButton
                title="Quitar ingrediente"
                aria-label="Quitar ingrediente"
                icon={<FaTimes />}
                onClick={remove}
              />
            </HStack>

            {recipe.ingredients.map((ingredient, index) => (
              <HStack key={index} paddingInlineStart="4rem">
                <Input value={ingredient.name} readOnly />
                <InputGroup width="25rem">
                  <Input
                    value={(ingredient.amount / recipe.amount) * item.amount}
                    readOnly
                  />
                  <InputRightElement width="4rem">
                    <Input value={ingredient.unit} readOnly />
                  </InputRightElement>
                </InputGroup>
              </HStack>
            ))}
          </VStack>
        );
      }}
    </FormList>
  );
}
