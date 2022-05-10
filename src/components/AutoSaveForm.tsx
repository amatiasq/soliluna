import {
  Form,
  Formik,
  FormikConfig,
  FormikValues,
  useFormikContext,
} from 'formik';
import React, {
  createContext,
  PropsWithChildren,
  useEffect,
  useRef,
} from 'react';
import { useScheduler } from '../hooks/useScheduler';
import { toFormikValidate } from '../util/toFormikValidate';

type AutoSaveState = 'idle' | 'scheduled' | 'submitting';
export const AutoSaveContext = createContext<AutoSaveState>('idle');

function AutoSaveAction({
  debounceMs,
  children,
}: PropsWithChildren<{ debounceMs: number }>) {
  const state = useRef<AutoSaveState>('idle');
  const formik = useFormikContext();

  const scheduler = useScheduler(debounceMs, () => {
    state.current = 'submitting';
    formik.submitForm();
  });

  function emergencySave() {
    if (scheduler.isRunning) {
      scheduler.run();
    }
  }

  if (state.current === 'submitting' && !formik.isSubmitting) {
    state.current = 'idle';
  }

  useEffect(() => {
    if (formik.dirty) {
      state.current = 'scheduled';
      scheduler.restart();
    }
  }, [JSON.stringify(formik.values)]);

  // This emergency save doesn't work
  useEffect(() => {
    window.addEventListener('beforeunload', emergencySave);
    return () => window.removeEventListener('beforeunload', emergencySave);
  }, []);

  return (
    <AutoSaveContext.Provider value={state.current}>
      {children}
    </AutoSaveContext.Provider>
  );
}

export type AutoSaveFormProps<Values extends FormikValues = FormikValues> =
  FormikConfig<Values> & { delayMs: number };

export function AutoSaveForm<Values extends FormikValues = FormikValues>({
  children,
  delayMs,
  validationSchema,
  ...props
}: AutoSaveFormProps<Values>) {
  return (
    <Formik {...props} validate={toFormikValidate(validationSchema)}>
      {(formikBag) => {
        (formikBag as any).validationSchema = validationSchema;

        if (formikBag.errors && Object.keys(formikBag.errors).length) {
          console.log('Form errors', formikBag.errors);
        }

        return (
          <Form>
            <AutoSaveAction debounceMs={delayMs}>
              {typeof children === 'function' ? children(formikBag) : children}
            </AutoSaveAction>
          </Form>
        );
      }}
    </Formik>
  );
}
