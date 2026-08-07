import { useEffect, useRef, useState } from 'react';

export type SaveState = 'idle' | 'pending' | 'saving' | 'offline' | 'error';

/** `onSave` returns 'offline' when it only queued; anything else is synced. */
export function useAutoSave<T>(
  values: T,
  onSave: (values: T) => Promise<void | 'offline'>,
  options?: { debounceMs?: number },
): SaveState {
  const debounceMs = options?.debounceMs ?? 500;

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const lastSavedJson = useRef<string>(JSON.stringify(values));
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    const currentJson = JSON.stringify(values);

    if (currentJson === lastSavedJson.current) {
      return;
    }

    setSaveState('pending');

    const timeout = setTimeout(() => {
      setSaveState('saving');

      onSaveRef
        .current(values)
        .then((result) => {
          lastSavedJson.current = currentJson;
          setSaveState(result === 'offline' ? 'offline' : 'idle');
        })
        .catch(() => {
          setSaveState('error');
        });
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [values, debounceMs]);

  return saveState;
}
