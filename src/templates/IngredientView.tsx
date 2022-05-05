import {
  Grid,
  GridItem,
  IconButton,
  InputGroup,
  InputRightAddon,
  InputRightElement,
} from '@chakra-ui/react';
import React, { useCallback } from 'react';
import { FaTimes } from 'react-icons/fa';
import { AutoSaveForm } from '../components/AutoSaveForm';
import { AutoSaveFormStatus } from '../components/AutoSaveFormStatus';
import { bindControl } from '../components/Control';
import { Dropdown } from '../components/Dropdown';
import { Loading } from '../components/Loading';
import { NumberInput } from '../components/NumberInput';
import { useFire } from '../hooks/useFire';
import {
  Ingredient,
  IngredientId,
  ingredientSchema,
} from '../model/Ingredient';
import { Unit } from '../model/Unit';
import { capitalise } from '../util/capitalise';

const IngredientControl = bindControl<Ingredient>();

export interface IngredientViewProps {
  id: IngredientId;
  gap?: number;
  delayMs?: number;
  remove: () => unknown;
}

export function IngredientView({
  id,
  delayMs = 1000,
  gap = 3,
  remove,
}: IngredientViewProps) {
  const { isLoading, data, set } = useFire<Ingredient>('ingredientes', id);
  const save = useCallback(
    (values: Ingredient) => set({ ...values, name: capitalise(values.name) }),
    [set]
  );

  if (isLoading) return <Loading />;

  return (
    <AutoSaveForm
      initialValues={data}
      validationSchema={ingredientSchema}
      delayMs={delayMs}
      onSubmit={save}
    >
      <Grid
        alignItems="center"
        gridTemplate={[
          ` "name name name name"
            "size price save remove"
            / 8fr 7fr 2rem auto`,
          '"name size price save remove" / 1fr 8rem 7rem 2rem auto',
        ]}
        gap="var(--chakra-space-2)"
      >
        <IngredientControl name="name" gridArea="name" />

        <InputGroup gridArea="size">
          <IngredientControl name="pkgSize" as={NumberInput} />
          <InputRightElement width="4rem">
            <IngredientControl name="pkgUnit" as={Dropdown} options={Unit} />
          </InputRightElement>
        </InputGroup>

        <InputGroup gridArea="price">
          <IngredientControl name="pkgPrice" as={NumberInput} />
          <InputRightAddon>€</InputRightAddon>
        </InputGroup>

        <GridItem gridArea="save" justifySelf="center">
          <AutoSaveFormStatus />
        </GridItem>

        <IconButton
          gridArea="remove"
          title="Borrar ingrediente"
          aria-label="Borrar ingrediente"
          icon={<FaTimes />}
          onClick={remove}
        />
      </Grid>
    </AutoSaveForm>
  );
}
