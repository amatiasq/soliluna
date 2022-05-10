import { forwardRef, Input, InputProps } from '@chakra-ui/react';
import { Timestamp } from 'firebase/firestore';
import { useFormikContext } from 'formik';
import React, { ChangeEvent, useCallback } from 'react';
import { date } from '../util/date';

export interface DateInputProps extends InputProps {
  name: string;
}

export const DateInput = forwardRef<DateInputProps, typeof Input>(
  (props, ref) => {
    const formik = useFormikContext();

    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
      const date = e.target.valueAsDate;
      formik.setFieldValue(props.name, date && Timestamp.fromDate(date));
    }, []);

    const value =
      props.value instanceof Timestamp
        ? date(props.value.toDate())
        : props.value || '';

    return (
      <Input
        {...props}
        ref={ref}
        type="date"
        value={value}
        onChange={handleChange}
      />
    );
  }
);
