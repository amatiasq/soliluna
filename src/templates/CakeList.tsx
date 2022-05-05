import { LinkBox, Tag } from '@chakra-ui/react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loading } from '../components/Loading';
import { useFireList } from '../hooks/useFireList';
import { SilList } from '../layout/SilList';
import { SilListItem } from '../layout/SilListItem';
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
      pax: '' as any,
      cost: 0,
      multiplier: 4,
      recipes: [],
      ingredients: [],
    });

    navigate(`/pasteles/${item.id}`);
  }

  return (
    <SilList title="Pasteles" addLabel="Añadir pastel" add={create}>
      {data.map((x) => (
        <LinkBox key={x.id}>
          <SilListItem
            name={x.name || '(sin nombre)'}
            remove={() => remove(x)}
            removeLabel="Borrar pastel"
            tag={`${x.pax || '0'} PAX`}
            url={`/pasteles/${x.id}`}
          >
            {x.recipes.map((y) => (
              <Tag key={y.id}>{y.name}</Tag>
            ))}
            {x.ingredients.map((y) => (
              <Tag key={y.id}>{y.name}</Tag>
            ))}
          </SilListItem>
        </LinkBox>
      ))}
    </SilList>
  );
}
