import { FormikContextType, useFormikContext } from 'formik';
import { useMemo } from 'react';

export type AutoSaveState = 'idle' | 'scheduled' | 'submitting';

interface AutoSaveRef {
  autoSaveState: AutoSaveState;
}

export type AutoSaveContext = FormikContextType<unknown> & AutoSaveRef;

export function useAutoSave() {
  const state = useMemo<AutoSaveRef>(() => {
    let state: AutoSaveState = 'idle';

    return {
      get autoSaveState() {
        return state;
      },

      set autoSaveState(value: AutoSaveState) {
        state = value;
        console.log('Setting', value);
      },
    };
  }, []);

  const formik = useFormikContext();

  Object.defineProperty(
    formik,
    'autoSaveState',
    Object.getOwnPropertyDescriptor(state, 'autoSaveState')!
  );

  return formik as AutoSaveContext;
}
