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
import { Recipe } from '../model/Recipe';

export function RecipeList() {
  const navigate = useNavigate();
  const { isLoading, data, add, remove } = useFireList<Recipe>('recetas', {
    orderBy: 'name',
  });

  if (isLoading) {
    return <Loading />;
  }

  async function create() {
    const item = await add({ name: 'Nueva receta', pax: 8, ingredients: [] });
    navigate(`/recetas/${item.id}`);
  }

  return (
    <VStack
      align="stretch"
      gap={3}
      divider={<StackDivider borderColor="gray.200" />}
    >
      <HStack>
        <Heading as="h1" flex={1}>
          Recetas
        </Heading>
        <IconButton
          aria-label="Añadir receta"
          icon={<Icon as={FaPlus} />}
          onClick={create}
        />
      </HStack>

      {data.map((x) => (
        <LinkBox>
          <RecipleListView data={x} remove={() => remove(x)} />
        </LinkBox>
      ))}
    </VStack>
  );
}

function RecipleListView({
  data,
  remove,
}: {
  data: Recipe;
  remove: () => unknown;
}) {
  return (
    <VStack align="stretch">
      <HStack justify="space-between">
        <Heading as="h3" fontSize="1.5rem">
          <LinkOverlay to={`/recetas/${data.id}`}>{data.name}</LinkOverlay>
        </Heading>

        <HStack>
          <Tag>{data.pax} pax</Tag>

          <IconButton
            title="Borrar receta"
            aria-label="Borrar receta"
            icon={<FaTimes />}
            onClick={remove}
          />
        </HStack>
      </HStack>
      <HStack>
        {data.ingredients.map((x, i) => (
          <Tag key={i}>{x.name}</Tag>
        ))}
      </HStack>
    </VStack>
  );
}
