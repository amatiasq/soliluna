import {
  FormControl,
  FormLabel,
  Heading,
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
import { Ingredient, IngredientId } from '../model/Ingredient';
import { Recipe, RecipeId, recipeSchema } from '../model/Recipe';
import { convert, getConversionsFor, Unit } from '../model/Unit';

type RecipeIngredient = Recipe['ingredients'][number];

const RecipeControl = bindFormControl<Recipe>();
const IngredientControl = bindControl<
  RecipeIngredient,
  `ingredients.${number}.`
>();

export interface RecipeViewProps {}

export function RecipeView() {
  const { id } = useParams<{ id: RecipeId }>();
  const { isLoading, data, set } = useFire<Recipe>('recetas', id!);
  const ingList = useFireList<Ingredient>('ingredientes', {
    orderBy: 'name',
  });

  if (isLoading || ingList.isLoading) {
    return <Loading />;
  }

  const ingredients = ingList.data;
  const [first] = ingredients;
  const names = ingredients.map((x) => ({ value: x.id, label: x.name }));
  const getIngredient = (id: IngredientId) =>
    ingredients.find((x) => x.id === id)!;

  return (
    <>
      <Heading as="h1">Receta: {data.name}</Heading>

      <AutoSaveForm
        initialValues={data}
        validationSchema={recipeSchema}
        delayMs={AUTOSAVE_DELAY}
        onSubmit={(x) => set(x)}
      >
        {({ values }) => {
          values.cost = values.ingredients.reduce((sum, x) => sum + x.cost, 0);

          return (
            <VStack>
              <RecipeControl name="name" label="Nombre" />
              <RecipeControl name="pax" label="PAX" as={NumberInput} />

              <FormControl>
                <FormLabel>Coste</FormLabel>
                <InputGroup>
                  <Input value={values.cost.toFixed(2)} isReadOnly />
                  <InputRightAddon>€</InputRightAddon>
                </InputGroup>
              </FormControl>

              <FormList<RecipeIngredient>
                name="ingredients"
                label="Ingredientes"
                addLabel="Añadir ingrediente"
                addItem={() => ({
                  id: first.id,
                  name: first.name,
                  cost: first.pkgPrice,
                  amount: first.pkgSize,
                  unit: first.pkgUnit,
                })}
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

                  item.cost = calculatePrice(
                    ingredient,
                    item.amount,
                    item.unit
                  );

                  return (
                    <HStack key={index}>
                      <IngredientControl
                        name={`ingredients.${index}.id`}
                        as={Dropdown}
                        options={names}
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

function calculatePrice(ingredient: Ingredient, amount: number, unit: Unit) {
  if (!amount || !unit) return 0;
  const base = convert(amount, unit, ingredient.pkgUnit);
  return (ingredient.pkgPrice / ingredient.pkgSize) * base;
}
