import {
  FormControl,
  FormLabel,
  Grid,
  Heading,
  Input,
  InputGroup,
  InputRightAddon,
  InputRightElement,
  VStack,
} from '@chakra-ui/react';
import React, { useCallback } from 'react';
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
import { capitalise } from '../util/capitalise';

const RecipeControl = bindFormControl<Recipe>();
const RecipeControlSimple = bindControl<Recipe>();

export interface RecipeViewProps {}

export function RecipeView() {
  const { id } = useParams<{ id: RecipeId }>();
  const { isLoading, data, set } = useFire<Recipe>('recetas', id!);
  const save = useCallback(
    (values: Recipe) => set({ ...values, name: capitalise(values.name) }),
    [set]
  );

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
        onSubmit={save}
      >
        {({ values }) => {
          values.cost = values.ingredients.reduce((sum, x) => sum + x.cost, 0);

          return (
            <VStack align="stretch">
              <RecipeControl name="name" label="Nombre" autoFocus />

              <Grid templateColumns="1fr 1fr" gap="var(--chakra-space-2)">
                <FormControl>
                  <FormLabel>Cantidad</FormLabel>
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
                </FormControl>

                <FormControl>
                  <FormLabel>Coste</FormLabel>
                  <InputGroup>
                    <Input value={values.cost.toFixed(2)} isReadOnly />
                    <InputRightAddon>€</InputRightAddon>
                  </InputGroup>
                </FormControl>
              </Grid>

              <RequiredIngredients />
            </VStack>
          );
        }}
      </AutoSaveForm>
    </>
  );
}
