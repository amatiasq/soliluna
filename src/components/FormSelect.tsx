import {
  FormControl,
  FormErrorMessage,
  Select,
  SelectProps,
} from '@chakra-ui/react';
import { useField } from 'formik';
import React, { useId } from 'react';

type List<T> = readonly T[];

export interface FormSelectProps<T>
  extends Omit<SelectProps, 'name' | 'children'> {
  name: keyof T;
  options: List<string>;
}

export function FormSelect<T>({
  name,
  options,
  isRequired,
  ...selectProps
}: FormSelectProps<T>) {
  const id = useId();
  const [field, meta] = useField(name as string);

  return (
    <FormControl
      isInvalid={Boolean(meta.error && meta.touched)}
      isRequired={isRequired}
    >
      {/* <FormLabel htmlFor={id}>First name</FormLabel> */}
      <Select {...selectProps} {...field} id={id}>
        {options.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </Select>
      <FormErrorMessage>{meta.error}</FormErrorMessage>
    </FormControl>
  );
}

export function bindSelect<T>() {
  return (props: FormSelectProps<T>) => <FormSelect<T> {...props} />;
}
