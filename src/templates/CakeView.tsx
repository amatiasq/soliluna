import {
  FormControl,
  FormLabel,
  Grid,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightAddon,
  VStack,
} from '@chakra-ui/react';
import React, { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { RequiredIngredients } from '../components-smart/RequiredIngredients';
import { RequiredRecipes } from '../components-smart/RequiredRecipes';
import { AutoSaveForm } from '../components/AutoSaveForm';
import { AutoSaveFormStatus } from '../components/AutoSaveFormStatus';
import { bindControl } from '../components/Control';
import { Dropdown } from '../components/Dropdown';
import { bindFormControl } from '../components/FormControl';
import { Loading } from '../components/Loading';
import { NumberInput } from '../components/NumberInput';
import { AUTOSAVE_DELAY } from '../constants';
import { useFire } from '../hooks/useFire';
import { Cake, CakeId } from '../model/Cake';
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
    <AutoSaveForm
      initialValues={data}
      validationSchema={Cake}
      delayMs={AUTOSAVE_DELAY}
      onSubmit={save}
    >
      {({ values }) => <CakeForm {...values} />}
    </AutoSaveForm>
  );
}

function CakeForm(values: Cake) {
  values.cost = useMemo(
    () =>
      values.recipes.reduce((sum, x) => sum + x.cost, 0) +
      values.ingredients.reduce((sum, x) => sum + x.cost, 0),
    [values.ingredients, values.recipes]
  );

  return (
    <VStack align="stretch">
      <Grid templateColumns="1fr auto" alignItems="center">
        <Heading as="h1">{values.name}</Heading>
        <AutoSaveFormStatus />
      </Grid>

      <Grid
        gap="var(--chakra-space-2)"
        gridTemplate={[
          `
                "name name"
                "pax cost"
                "price price"
                "recipes recipes"
                "ingredients ingredients"
                / 1fr 1fr
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
        <CakeControl gridArea="name" name="name" label="Nombre" autoFocus />
        <CakeControl gridArea="pax" name="pax" label="PAX" as={NumberInput} />

        <RequiredRecipes gridArea="recipes" pax={values.pax} />
        <RequiredIngredients gridArea="ingredients" />

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
      </Grid>
    </VStack>
  );
}
