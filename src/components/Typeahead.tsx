import { forwardRef } from '@chakra-ui/react';
import React from 'react';
import Select, { Props as SelectProps } from 'react-select';

export type TypeaheadProps = SelectProps;

export const Typeahead = forwardRef<TypeaheadProps, 'select'>((props, ref) => {
  console.log(props);
  return <Select ref={ref} {...props} />;
});
