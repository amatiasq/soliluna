import { LinkBox, Tag } from '@chakra-ui/react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loading } from '../components/Loading';
import { useFireList } from '../hooks/useFireList';
import { SilList } from '../layout/SilList';
import { SilListItem } from '../layout/SilListItem';
import { Recipe } from '../model/Recipe';
import { RecipeUnit } from '../model/RecipeUnit';

export function RecipeList() {
  const navigate = useNavigate();
  const { isLoading, data, add, remove } = useFireList<Recipe>('recetas', {
    orderBy: 'name',
  });

  if (isLoading) {
    return <Loading />;
  }

  async function create() {
    const item = await add({
      name: '',
      cost: 0,
      amount: 8,
      unit: RecipeUnit[0],
      ingredients: [],
    });
    navigate(`/recetas/${item.id}`);
  }

  return (
    <SilList title="Recetas" addLabel="Añadir receta" add={create}>
      {data.map((x) => (
        <LinkBox key={x.id}>
          <SilListItem
            name={x.name || '(sin nombre)'}
            remove={() => remove(x)}
            removeLabel={`Borrar receta ${x.name || ''}`}
            tag={`${x.amount} ${x.unit}`}
            url={`/recetas/${x.id}`}
          >
            {x.ingredients.map((x, i) => (
              <Tag key={i}>{x.name}</Tag>
            ))}
          </SilListItem>
        </LinkBox>
      ))}
    </SilList>
  );
}
