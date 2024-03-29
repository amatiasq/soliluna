import { FormControl, forwardRef, Input, InputProps } from '@chakra-ui/react';
import { useField } from 'formik';
import { useId, useMemo } from 'react';

export interface ControlProps<T, Prefix extends string = ''>
  extends Omit<InputProps, 'name'> {
  name: `${Prefix}${Extract<keyof T, string | number>}`;
}

export function bindControl<T, Prefix extends string = ''>() {
  const Control = forwardRef<ControlProps<T, Prefix>, 'input'>(
    ({ name, isRequired, gridArea, isInvalid, ...rest }, ref) => {
      const id = useId();
      const [field, meta] = useField(name as string);

      const onChange = useMemo(() => {
        if (!rest.onChange) {
          return field.onChange;
        }

        return (x: any) => {
          field.onChange(x);
          rest.onChange!(x);
        };

        // This rule is asking to add `field` to the dependencies array
        // but we only use field.onChange
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [rest.onChange, field.onChange]);

      return (
        <FormControl
          isInvalid={isInvalid || Boolean(meta.error && meta.touched)}
          isRequired={isRequired}
          gridArea={gridArea}
        >
          <Input
            {...field}
            {...rest}
            onChange={onChange}
            ref={ref}
            name={name as string}
            id={id}
          />
        </FormControl>
      );
    }
  );

  Control.id = 'Input';
  return Control;
}
