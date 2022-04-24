import React, { useCallback } from 'react';

export function useOnChange<T>(
  handler: (value: T) => unknown,
  getter = (event: React.ChangeEvent<HTMLInputElement>) =>
    event.target.value as unknown as T
) {
  return useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => handler(getter(event)),
    [handler, getter]
  );
}
