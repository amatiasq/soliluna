import {
  HStack,
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

const IngredientControl = bindControl<Ingredient>();

function capitalise(x: string) {
  const trimmed = x.trim();
  return `${trimmed[0].toUpperCase()}${trimmed.substring(1)}`;
}

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
    (values: Ingredient) => {
      console.log('[SAVE]', values.name);
      return set({
        ...values,
        name: capitalise(values.name),
      });
    },
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
      <HStack gap={3}>
        <HStack gap={gap}>
          <IngredientControl name="name" />
          <InputGroup>
            <IngredientControl name="pkgSize" as={NumberInput} />
            <InputRightElement width="4rem">
              <IngredientControl name="pkgUnit" as={Dropdown} options={Unit} />
            </InputRightElement>
          </InputGroup>
          <InputGroup>
            <IngredientControl name="pkgPrice" as={NumberInput} />
            <InputRightAddon>€</InputRightAddon>
          </InputGroup>
        </HStack>

        <AutoSaveFormStatus />

        <IconButton
          title="Borrar ingrediente"
          aria-label="Borrar ingrediente"
          icon={<FaTimes />}
          onClick={remove}
        />
      </HStack>
    </AutoSaveForm>
  );
}
