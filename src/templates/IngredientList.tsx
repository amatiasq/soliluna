import { Heading, HStack, Icon, IconButton } from '@chakra-ui/react';
import React from 'react';
import { FaPlus } from 'react-icons/fa';
import { Loading } from '../components/Loading';
import { AUTOSAVE_DELAY } from '../constants';
import { useFireList } from '../hooks/useFireList';
import { Ingredient } from '../model/Ingredient';
import { Unit } from '../model/Unit';
import { IngredientView } from './IngredientView';

export function IngredientList() {
  const { isLoading, data, add, remove } = useFireList<Ingredient>(
    'ingredientes',
    { orderBy: 'name' }
  );

  if (isLoading) return <Loading />;

  return (
    <>
      <HStack>
        <Heading as="h1" flex={1}>
          Ingredientes
        </Heading>

        <IconButton
          aria-label="Añadir ingrediente"
          icon={<Icon as={FaPlus} />}
          onClick={() =>
            add({ name: '', pkgSize: 1, pkgUnit: Unit[0], pkgPrice: 1 })
          }
        />
      </HStack>

      {data.map((x) => (
        <IngredientView
          key={x.id}
          id={x.id}
          gap={0}
          delayMs={AUTOSAVE_DELAY}
          remove={() => remove(x)}
        />
      ))}
    </>
  );
}
