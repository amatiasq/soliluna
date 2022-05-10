import { ChangeEvent } from 'react';

export function focusNextInput({ target }: ChangeEvent<HTMLInputElement>) {
  const parent = target.closest('.chakra-form-control')?.parentElement;

  if (!parent) return;

  setTimeout(() => {
    const input = parent.querySelector<HTMLInputElement>(
      'input:not([readonly]):not([type=checkbox])'
    );

    if (input) {
      input.select();
    }
  }, 10);
}
