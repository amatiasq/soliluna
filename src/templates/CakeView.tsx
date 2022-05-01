import {
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightAddon,
  InputRightElement,
  VStack,
} from '@chakra-ui/react';
import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { useParams } from 'react-router-dom';
import { AutoSaveForm } from '../components/AutoSaveForm';
import { bindControl } from '../components/Control';
import { Dropdown } from '../components/Dropdown';
import { bindFormControl } from '../components/FormControl';
import { FormList } from '../components/FormList';
import { Loading } from '../components/Loading';
import { NumberInput } from '../components/NumberInput';
import { AUTOSAVE_DELAY } from '../constants';
import { useFire } from '../hooks/useFire';
import { useFireList } from '../hooks/useFireList';
import { Cake, CakeId, cakeSchema } from '../model/Cake';
import {
  calculateIngredientPrice,
  Ingredient,
  IngredientId,
} from '../model/Ingredient';
import { multiplierOptions } from '../model/Multipliers';
import { ingredientToRecipe, Recipe, RecipeId } from '../model/Recipe';
import { getConversionsFor } from '../model/Unit';

type CakeRecipe = Cake['recipes'][number];
type CakeIngredient = Cake['ingredients'][number];

const CakeControl = bindFormControl<Cake>();
const CakeSimpleControl = bindControl<Cake>();
const RecipeControl = bindControl<CakeRecipe, `recipes.${number}.`>();
const IngredientControl = bindControl<
  CakeIngredient,
  `ingredients.${number}.`
>();

export interface CakeViewProps {}

export function CakeView() {
  const { id } = useParams<{ id: CakeId }>();
  const { isLoading, data, set } = useFire<Cake>('pasteles', id!);
  const recipeList = useFireList<Recipe>('recetas', { orderBy: 'name' });
  const ingList = useFireList<Ingredient>('ingredientes', { orderBy: 'name' });

  if (isLoading || recipeList.isLoading || ingList.isLoading) {
    return <Loading />;
  }

  const recipes = recipeList.data;
  const [defaultRecipe] = recipes;
  const ingredients = ingList.data;
  const [defaultIngredient] = ingredients;

  const recipeNames = recipes.map((x) => ({ value: x.id, label: x.name }));
  const ingredientNames = ingredients.map((x) => ({
    value: x.id,
    label: x.name,
  }));

  const getRecipe = (id: RecipeId) => recipes.find((x) => x.id === id)!;
  const getIngredient = (id: IngredientId) =>
    ingredients.find((x) => x.id === id)!;

  // migration
  if (!data.ingredients) data.ingredients = [];

  return (
    <>
      <Heading as="h1">Receta: {data.name}</Heading>

      <AutoSaveForm
        initialValues={data}
        validationSchema={cakeSchema}
        delayMs={AUTOSAVE_DELAY}
        onSubmit={(x) => set(x)}
      >
        {({ values }) => {
          values.cost =
            values.recipes.reduce((sum, x) => sum + x.cost, 0) +
            values.ingredients.reduce((sum, x) => sum + x.cost, 0);

          return (
            <VStack align="stretch">
              <CakeControl name="name" label="Nombre" />
              <CakeControl name="pax" label="PAX" as={NumberInput} />

              <FormControl>
                <FormLabel>Coste</FormLabel>
                <InputGroup>
                  <Input value={values.cost.toFixed(2)} isReadOnly />
                  <InputRightAddon>€</InputRightAddon>
                </InputGroup>
              </FormControl>

              <FormControl>
                <FormLabel>Precio</FormLabel>
                <InputGroup>
                  <InputLeftElement width="4rem">
                    <CakeSimpleControl
                      name="multiplier"
                      as={Dropdown}
                      options={multiplierOptions}
                    />
                  </InputLeftElement>
                  <Input
                    value={(values.cost * values.multiplier).toFixed(2)}
                    isReadOnly
                    paddingLeft="6rem"
                  />
                  <InputRightAddon>€</InputRightAddon>
                </InputGroup>
              </FormControl>

              <FormList<CakeRecipe>
                name="recipes"
                label="Recetas"
                addLabel="Añadir receta"
                addItem={() => ({ ...defaultRecipe, ingredients: [] })}
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
                    item.amount = values.pax;
                  }

                  item.cost = recipe.amount
                    ? (recipe.cost / recipe.amount) * item.amount
                    : 0;

                  return (
                    <HStack key={index}>
                      <RecipeControl
                        name={`recipes.${index}.id`}
                        as={Dropdown}
                        options={recipeNames}
                      />

                      <InputGroup width="25rem">
                        <RecipeControl
                          name={`recipes.${index}.amount`}
                          as={NumberInput}
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
                  );
                }}
              </FormList>

              <FormList<CakeIngredient>
                name="ingredients"
                label="Ingredientes"
                addLabel="Añadir ingrediente"
                addItem={() => ingredientToRecipe(defaultIngredient)}
              >
                {({ index, item, remove }) => {
                  const ingredient = getIngredient(item.id);

                  if (!ingredient) {
                    remove();
                    return null;
                  }

                  const units = getConversionsFor(ingredient.pkgUnit);

                  if (item.name !== ingredient.name) {
                    item.name = ingredient.name;
                    item.unit = ingredient.pkgUnit;
                  }

                  item.cost = calculateIngredientPrice(
                    ingredient,
                    item.amount,
                    item.unit
                  );

                  return (
                    <HStack key={index}>
                      <IngredientControl
                        name={`ingredients.${index}.id`}
                        as={Dropdown}
                        options={ingredientNames}
                      />

                      <InputGroup width="25rem">
                        <IngredientControl
                          name={`ingredients.${index}.amount`}
                          as={NumberInput}
                        />
                        <InputRightElement width="4rem">
                          <IngredientControl
                            name={`ingredients.${index}.unit`}
                            as={Dropdown}
                            options={units}
                            isDisabled={units.length === 1}
                          />
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
                  );
                }}
              </FormList>
            </VStack>
          );
        }}
      </AutoSaveForm>
    </>
  );
}
