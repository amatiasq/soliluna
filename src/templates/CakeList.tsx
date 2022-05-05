import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loading } from '../components/Loading';
import { NiceTag } from '../components/NiceTag';
import { useFireList } from '../hooks/useFireList';
import { SilList } from '../layout/SilList';
import { SilListItem } from '../layout/SilListItem';
import { Cake } from '../model/Cake';
import { printUnit } from '../model/Unit';

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
        <SilListItem
          key={x.id}
          name={x.name || '(sin nombre)'}
          remove={() => remove(x)}
          removeLabel={`Borrar pastel ${x.name || ''}`}
          tag={`${x.pax || '0'} PAX`}
          url={`/pasteles/${x.id}`}
        >
          {x.recipes.map((y) => (
            <NiceTag
              key={y.id}
              colorScheme="orange"
              tooltip={printUnit(y.amount, y.unit)}
            >
              {y.name}
            </NiceTag>
          ))}
          {x.ingredients.map((y) => (
            <NiceTag key={y.id} tooltip={printUnit(y.amount, y.unit)}>
              {y.name}
            </NiceTag>
          ))}
        </SilListItem>
      ))}
    </SilList>
  );
}
