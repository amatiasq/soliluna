import {
  FormControl,
  FormLabel,
  Heading,
  Input,
  InputGroup,
  InputRightAddon,
  InputRightElement,
  VStack,
} from '@chakra-ui/react';
import React from 'react';
import { useParams } from 'react-router-dom';
import { RequiredIngredients } from '../components-smart/RequiredIngredients';
import { AutoSaveForm } from '../components/AutoSaveForm';
import { bindControl } from '../components/Control';
import { Dropdown } from '../components/Dropdown';
import { bindFormControl } from '../components/FormControl';
import { Loading } from '../components/Loading';
import { NumberInput } from '../components/NumberInput';
import { AUTOSAVE_DELAY } from '../constants';
import { useFire } from '../hooks/useFire';
import { Recipe, RecipeId, recipeSchema } from '../model/Recipe';
import { RecipeUnit } from '../model/RecipeUnit';

type RecipeIngredient = Recipe['ingredients'][number];

const RecipeControl = bindFormControl<Recipe>();
const RecipeControlSimple = bindControl<Recipe>();
const IngredientControl = bindControl<
  RecipeIngredient,
  `ingredients.${number}.`
>();

export interface RecipeViewProps {}

export function RecipeView() {
  const { id } = useParams<{ id: RecipeId }>();
  const { isLoading, data, set } = useFire<Recipe>('recetas', id!);

  if (isLoading) {
    return <Loading />;
  }

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

              <InputGroup>
                <RecipeControlSimple name="amount" as={NumberInput} />
                <InputRightElement width="5rem">
                  <RecipeControlSimple
                    name="unit"
                    as={Dropdown}
                    options={RecipeUnit}
                  />
                </InputRightElement>
              </InputGroup>

              <FormControl>
                <FormLabel>Coste</FormLabel>
                <InputGroup>
                  <Input value={values.cost.toFixed(2)} isReadOnly />
                  <InputRightAddon>€</InputRightAddon>
                </InputGroup>
              </FormControl>

              <RequiredIngredients />
            </VStack>
          );
        }}
      </AutoSaveForm>
    </>
  );
}
