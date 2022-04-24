import {
  FormControl,
  FormHelperText,
  FormLabel,
  Icon,
  IconButton,
  Stack,
  StackProps,
  useId,
} from '@chakra-ui/react';
import { FieldArray, useFormikContext } from 'formik';
import React from 'react';
import { FaPlus } from 'react-icons/fa';

export interface FormListProps<T> extends Omit<StackProps, 'children'> {
  name: string;
  label?: string;
  info?: string;
  addLabel: string;
  addItem: () => T | Promise<T>;
  onRemove?: (item: T, index: number) => unknown | Promise<unknown>;
  children: (x: { index: number; item: T; remove(): void }) => JSX.Element;
}

export function FormList<T>({
  label,
  info,
  name,
  addLabel,
  addItem,
  onRemove,
  children,
  ...stackProps
}: FormListProps<T>) {
  const id = useId();
  const form = useFormikContext();
  const { value } = form.getFieldMeta<T[]>(name);

  return (
    <>
      {label || info ? (
        <FormControl>
          {label ? <FormLabel htmlFor={id}>{label}</FormLabel> : null}
          {info ? <FormHelperText>{info}</FormHelperText> : null}
        </FormControl>
      ) : null}

      <FieldArray name={name}>
        {({ push, remove }) => (
          <Stack direction="column" align="baseline" {...stackProps}>
            {value.map((item, index) => {
              const handleRemove = onRemove
                ? () => {
                    onRemove(item, index);
                    remove(index);
                  }
                : () => remove(index);

              return children({ index, item, remove: handleRemove });
            })}

            <IconButton
              id={id}
              title={addLabel}
              aria-label={addLabel}
              icon={<Icon as={FaPlus} />}
              onClick={async () => push(await addItem())}
            />
          </Stack>
        )}
      </FieldArray>
    </>
  );
}

FormList.displayName = 'FormList';
