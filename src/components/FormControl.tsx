import {
  FormControl as ChakraFormControl,
  FormErrorMessage,
  FormLabel,
  forwardRef,
  Input,
  InputProps,
} from '@chakra-ui/react';
import { useField } from 'formik';
import React, { useId } from 'react';

export interface FormControlProps<T> extends Omit<InputProps, 'name'> {
  name: keyof T;
  label: string;
}

export function bindFormControl<T>() {
  return forwardRef<FormControlProps<T>, 'input'>(
    ({ name, label, isRequired, gridArea, children, ...rest }, ref) => {
      const id = useId();
      const [field, meta] = useField(name as string);

      return (
        <ChakraFormControl
          isInvalid={Boolean(meta.error && meta.touched)}
          isRequired={isRequired}
          gridArea={gridArea}
        >
          <FormLabel htmlFor={id}>{label}</FormLabel>
          <Input {...rest} {...field} ref={ref} name={name as string} id={id} />
          <FormErrorMessage>{meta.error}</FormErrorMessage>
        </ChakraFormControl>
      );
    }
  );
}
