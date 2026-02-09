import { useEffect, useRef, useState } from 'react';

export type SaveState = 'idle' | 'pending' | 'saving' | 'offline' | 'error';

/**
 * Watches form values and auto-saves after a debounce period.
 * Uses JSON.stringify for deep comparison to skip unnecessary saves.
 * Returns the current save state for UI indicators.
 *
 * The onSave callback may return 'offline' to signal the save was
 * queued locally but not sent to the server. Any other return value
 * (or void) is treated as a successful sync.
 */
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

    // Skip if nothing changed since last save
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
