import {
  FormControl,
  FormLabel,
  Grid,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightAddon,
} from '@chakra-ui/react';
import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { RequiredIngredients } from '../components-smart/RequiredIngredients';
import { RequiredRecipes } from '../components-smart/RequiredRecipes';
import { AutoSaveForm } from '../components/AutoSaveForm';
import { bindControl } from '../components/Control';
import { Dropdown } from '../components/Dropdown';
import { bindFormControl } from '../components/FormControl';
import { Loading } from '../components/Loading';
import { NumberInput } from '../components/NumberInput';
import { AUTOSAVE_DELAY } from '../constants';
import { useFire } from '../hooks/useFire';
import { Cake, CakeId, cakeSchema } from '../model/Cake';
import { multiplierOptions } from '../model/Multipliers';
import { capitalise } from '../util/capitalise';

const CakeControl = bindFormControl<Cake>();
const CakeSimpleControl = bindControl<Cake>();

export interface CakeViewProps {}

export function CakeView() {
  const { id } = useParams<{ id: CakeId }>();
  const { isLoading, data, set } = useFire<Cake>('pasteles', id!);
  const save = useCallback(
    (values: Cake) => set({ ...values, name: capitalise(values.name) }),
    [set]
  );

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <Heading as="h1">Pastel: {data.name}</Heading>

      <AutoSaveForm
        initialValues={data}
        validationSchema={cakeSchema}
        delayMs={AUTOSAVE_DELAY}
        onSubmit={save}
      >
        {({ values }) => {
          values.cost =
            values.recipes.reduce((sum, x) => sum + x.cost, 0) +
            values.ingredients.reduce((sum, x) => sum + x.cost, 0);

          return (
            <Grid
              gap="var(--chakra-space-2)"
              gridTemplate={[
                `
                "name"
                "pax"
                "cost"
                "price"
                "recipes"
                "ingredients"
                / 1fr
              `,
                `
                  "name name name"
                  "pax cost price"
                  "recipes recipes recipes"
                  "ingredients ingredients ingredients"
                  / 1fr 2fr 2fr
                `,
              ]}
            >
              <CakeControl
                gridArea="name"
                name="name"
                label="Nombre"
                autoFocus
              />

              <CakeControl
                gridArea="pax"
                name="pax"
                label="PAX"
                as={NumberInput}
              />

              <FormControl gridArea="cost">
                <FormLabel>Coste</FormLabel>
                <InputGroup>
                  <Input value={values.cost.toFixed(2)} isReadOnly />
                  <InputRightAddon>€</InputRightAddon>
                </InputGroup>
              </FormControl>

              <FormControl gridArea="price">
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

              <RequiredRecipes gridArea="recipes" pax={values.pax} />
              <RequiredIngredients gridArea="ingredients" />
            </Grid>
          );
        }}
      </AutoSaveForm>
    </>
  );
}
