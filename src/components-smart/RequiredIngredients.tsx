import {
  Grid,
  Input,
  InputGroup,
  InputRightAddon,
  InputRightElement,
} from '@chakra-ui/react';
import React from 'react';
import { bindControl } from '../components/Control';
import { DeleteButton } from '../components/DeleteButton';
import { Dropdown } from '../components/Dropdown';
import { FormList } from '../components/FormList';
import { Loading } from '../components/Loading';
import { useFireList } from '../hooks/useFireList';
import {
  calculateIngredientPrice,
  Ingredient,
  IngredientId,
} from '../model/Ingredient';
import { ingredientToUsage, IngredientUsage } from '../model/IngredientUsage';
import { getConversionsFor, smallestUnit } from '../model/Unit';
import { focusNextInput } from '../util/focusNextInput';

export interface RequiredIngredientsProps {
  gridArea?: string;
}

const IngredientControl = bindControl<
  IngredientUsage,
  `ingredients.${number}.`
>();

export function RequiredIngredients({ gridArea }: RequiredIngredientsProps) {
  const { data, isLoading } = useFireList<Ingredient>('ingredientes', {
    orderBy: 'name',
  });

  if (isLoading) {
    return <Loading />;
  }

  const getIngredient = (id: IngredientId) => data.find((x) => x.id === id)!;
  const names = data.map((x) => ({ value: x.id, label: x.name }));
  const [defaultIngredient] = data;

  return (
    <FormList<IngredientUsage>
      gridArea={gridArea}
      gap={['var(--chakra-space-6)', 'var(--chakra-space-2)']}
      name="ingredients"
      label="Ingredientes"
      addLabel="Añadir ingrediente"
      addItem={() => ingredientToUsage(defaultIngredient)}
    >
      {({ index, item, remove }) => {
        const ingredient = getIngredient(item.id);

        if (!ingredient) {
          remove();
          return null;
        }

        const units = getConversionsFor(ingredient.pkgUnit);
        const changed = item.name !== ingredient.name;

        if (changed) {
          item.name = ingredient.name;
          item.unit = smallestUnit(ingredient.pkgUnit);
        }

        item.cost = calculateIngredientPrice(
          ingredient,
          item.amount,
          item.unit
        );

        return (
          <Grid
            key={index}
            gap="var(--chakra-space-2)"
            gridTemplate={[
              `
                "name name name"
                "quantity cost remove"
                / 8fr 7fr auto`,
              `
                "name quantity cost remove"
                / 1fr 8rem 7rem auto
              `,
            ]}
          >
            <IngredientControl
              gridArea="name"
              name={`ingredients.${index}.id`}
              as={Dropdown}
              options={names}
              onChange={focusNextInput}
            />

            <InputGroup gridArea="quantity">
              <IngredientControl
                name={`ingredients.${index}.amount`}
                as={Input}
              />
              <InputRightElement width="4rem">
                <IngredientControl
                  name={`ingredients.${index}.unit`}
                  as={Dropdown}
                  options={units}
                  isDisabled={units.length === 1}
                />
              </InputRightElement>
            </InputGroup>

            <InputGroup gridArea="cost">
              <Input value={item.cost.toFixed(2)} isReadOnly />
              <InputRightAddon>€</InputRightAddon>
            </InputGroup>

            <DeleteButton
              gridArea="remove"
              label={`Quitar ${item.name}`}
              onConfirm={remove}
            />
          </Grid>
        );
      }}
    </FormList>
  );
}
