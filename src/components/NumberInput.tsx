import { forwardRef, Input, InputProps } from '@chakra-ui/react';
import { useFormikContext } from 'formik';
import { ChangeEvent, useCallback } from 'react';

export interface NumberInputProps extends InputProps {
  name: string;
}

export const NumberInput = forwardRef<NumberInputProps, typeof Input>(
  (props, ref) => {
    const formik = useFormikContext();

    const handleChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        if (!Number.isNaN(e.target.valueAsNumber))
          formik.setFieldValue(props.name, e.target.valueAsNumber);
      },
      [formik, props.name]
    );

    return <Input {...props} ref={ref} type="number" onChange={handleChange} />;
  }
);
