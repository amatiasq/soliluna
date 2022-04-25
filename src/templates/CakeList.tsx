import {
  Heading,
  HStack,
  Icon,
  IconButton,
  LinkBox,
  StackDivider,
  Tag,
  VStack,
} from '@chakra-ui/react';
import React from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { LinkOverlay } from '../components/Link';
import { Loading } from '../components/Loading';
import { useFireList } from '../hooks/useFireList';
import { Cake } from '../model/Cake';

export function CakeList() {
  const navigate = useNavigate();
  const { isLoading, data, add, remove } = useFireList<Cake>('pasteles', {
    orderBy: 'name',
  });

  if (isLoading) {
    return <Loading />;
  }

  async function create() {
    const item = await add({
      name: 'Nuevo pastel',
      pax: 8,
      cost: 0,
      multiplier: 4,
      recipes: [],
    });

    navigate(`/pasteles/${item.id}`);
  }

  return (
    <VStack
      align="stretch"
      gap={3}
      divider={<StackDivider borderColor="gray.200" />}
    >
      <HStack>
        <Heading as="h1" flex={1}>
          Pasteles
        </Heading>
        <IconButton
          aria-label="Añadir pastel"
          icon={<Icon as={FaPlus} />}
          onClick={create}
        />
      </HStack>

      {data.map((x) => (
        <LinkBox key={x.id}>
          <CakeListView data={x} remove={() => remove(x)} />
        </LinkBox>
      ))}
    </VStack>
  );
}

function CakeListView({ data, remove }: { data: Cake; remove: () => unknown }) {
  return (
    <VStack align="stretch">
      <HStack justify="space-between">
        <Heading as="h3" fontSize="1.5rem">
          <LinkOverlay to={`/pasteles/${data.id}`}>{data.name}</LinkOverlay>
        </Heading>

        <HStack>
          <Tag>{data.pax} pax</Tag>

          <IconButton
            title="Borrar pastel"
            aria-label="Borrar pastel"
            icon={<FaTimes />}
            onClick={remove}
          />
        </HStack>
      </HStack>
      <HStack>
        {data.recipes.map((x, i) => (
          <Tag key={i}>{x.name}</Tag>
        ))}
      </HStack>
    </VStack>
  );
}
