import {
  Grid,
  GridItem,
  InputGroup,
  InputRightAddon,
  InputRightElement,
} from '@chakra-ui/react';
import { useCallback } from 'react';
import { AutoSaveForm } from '../components/AutoSaveForm';
import { AutoSaveFormStatus } from '../components/AutoSaveFormStatus';
import { bindControl } from '../components/Control';
import { DeleteButton } from '../components/DeleteButton';
import { Dropdown } from '../components/Dropdown';
import { Loading } from '../components/Loading';
import { NumberInput } from '../components/NumberInput';
import { useFire } from '../hooks/useFire';
import { Ingredient, IngredientId } from '../model/Ingredient';
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
      validationSchema={Ingredient}
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
            <IngredientControl
              name="pkgUnit"
              as={Dropdown}
              // options is a property of Dropdown
              // Chakra knows that but for some reason typescript complains
              // @ts-ignore see above
              options={Unit}
            />
          </InputRightElement>
        </InputGroup>

        <InputGroup gridArea="price">
          <IngredientControl name="pkgPrice" as={NumberInput} />
          <InputRightAddon>€</InputRightAddon>
        </InputGroup>

        <GridItem gridArea="save" justifySelf="center">
          <AutoSaveFormStatus />
        </GridItem>

        <DeleteButton
          gridArea="remove"
          label="Borrar ingrediente"
          onConfirm={remove}
        />
      </Grid>
    </AutoSaveForm>
  );
}
