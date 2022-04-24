import { forwardRef, Select, SelectProps } from '@chakra-ui/react';
import React from 'react';

type Item = number | string | { value: string; label: string };

function renderOption(item: Item) {
  if (typeof item === 'string' || typeof item === 'number')
    return (
      <option key={item} value={item}>
        {item}
      </option>
    );

  return (
    <option key={item.value} value={item.value}>
      {item.label}
    </option>
  );
}

export type DropdownProps =
  | SelectProps
  | (Omit<SelectProps, 'children'> & { options: Item[] });

export const Dropdown = forwardRef<DropdownProps, 'select'>((props, ref) => {
  if (!('options' in props)) {
    return <Select ref={ref} {...props} />;
  }

  const { options, ...selectProps } = props;

  return (
    <Select ref={ref} {...selectProps}>
      {options.map(renderOption)}
    </Select>
  );
});
