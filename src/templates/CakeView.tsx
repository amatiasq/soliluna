import {
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightAddon,
  VStack,
} from '@chakra-ui/react';
import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { useParams } from 'react-router-dom';
import { AutoSaveForm } from '../components/AutoSaveForm';
import { bindControl } from '../components/Control';
import { Dropdown } from '../components/Dropdown';
import { bindFormControl } from '../components/FormControl';
import { FormList } from '../components/FormList';
import { Loading } from '../components/Loading';
import { NumberInput } from '../components/NumberInput';
import { useFire } from '../hooks/useFire';
import { useFireList } from '../hooks/useFireList';
import { Cake, CakeId, cakeSchema } from '../model/Cake';
import { multiplierOptions } from '../model/Multipliers';
import { Recipe, RecipeId } from '../model/Recipe';

type CakeRecipe = Cake['recipes'][number];

const CakeControl = bindFormControl<Cake>();
const CakeSimpleControl = bindControl<Cake>();
const RecipeControl = bindControl<CakeRecipe, `recipes.${number}.`>();

export interface CakeViewProps {}

export function CakeView() {
  const { id } = useParams<{ id: CakeId }>();
  const { isLoading, data, set } = useFire<Cake>('pasteles', id!);
  const recipeList = useFireList<Recipe>('recetas', {
    orderBy: 'name',
  });

  if (isLoading || recipeList.isLoading) {
    return <Loading />;
  }

  const recipes = recipeList.data;
  const [first] = recipes;
  const names = recipes.map((x) => ({ value: x.id, label: x.name }));
  const getRecipe = (id: RecipeId) => recipes.find((x) => x.id === id)!;

  return (
    <>
      <Heading as="h1">Receta: {data.name}</Heading>

      <AutoSaveForm
        initialValues={data}
        validationSchema={cakeSchema}
        delayMs={300}
        onSubmit={(x) => set(x)}
      >
        {({ values }) => {
          values.cost = values.recipes.reduce((sum, x) => sum + x.cost, 0);

          return (
            <VStack align="stretch">
              <CakeControl name="name" label="Nombre" />
              <CakeControl name="pax" label="PAX" as={NumberInput} />

              <FormControl>
                <FormLabel>Coste</FormLabel>
                <InputGroup>
                  <Input value={values.cost.toFixed(2)} isReadOnly />
                  <InputRightAddon>€</InputRightAddon>
                </InputGroup>
              </FormControl>

              <FormControl>
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

              <FormList<CakeRecipe>
                name="recipes"
                label="Recetas"
                addLabel="Añadir receta"
                addItem={() => ({
                  id: first.id,
                  name: first.name,
                  pax: first.pax,
                  cost: first.cost,
                })}
                align="stretch"
              >
                {({ index, item, remove }) => {
                  const recipe = getRecipe(item.id);
                  // const units = getConversionsFor(recipe.pkgUnit);

                  if (item.name !== recipe.name) {
                    item.name = recipe.name;
                    item.pax = recipe.pax;
                  }

                  item.cost = values.pax
                    ? (recipe.cost / recipe.pax) * values.pax
                    : 0;

                  return (
                    <HStack key={index} align="stretch">
                      <RecipeControl
                        name={`recipes.${index}.id`}
                        as={Dropdown}
                        options={names}
                      />

                      <InputGroup>
                        <Input value={item.cost.toFixed(2)} isReadOnly />
                        <InputRightAddon>€</InputRightAddon>
                      </InputGroup>

                      <IconButton
                        title="Quitar ingrediente"
                        aria-label="Quitar ingrediente"
                        icon={<FaTimes />}
                        onClick={remove}
                      />
                    </HStack>
                  );
                }}
              </FormList>
            </VStack>
          );
        }}
      </AutoSaveForm>
    </>
  );
}
