import { FormControl, forwardRef, Input, InputProps } from '@chakra-ui/react';
import { useField } from 'formik';
import React, { useId } from 'react';

export interface ControlProps<T, Prefix extends string = ''>
  extends Omit<InputProps, 'name'> {
  name: `${Prefix}${keyof T}`;
}

export function bindControl<T, Prefix extends string = ''>() {
  const Control = forwardRef<ControlProps<T, Prefix>, 'input'>(
    ({ name, isRequired, children, gridArea, ...rest }, ref) => {
      const id = useId();
      const [field, meta] = useField(name as string);

      return (
        <FormControl
          isInvalid={Boolean(meta.error && meta.touched)}
          isRequired={isRequired}
          gridArea={gridArea}
        >
          <Input {...rest} {...field} ref={ref} name={name as string} id={id} />
        </FormControl>
      );
    }
  );

  Control.id = 'Input';
  return Control;
}
