import {
  Form,
  Formik,
  FormikConfig,
  FormikValues,
  useFormikContext,
} from 'formik';
import React, { useEffect } from 'react';
import { useScheduler } from '../hooks/useScheduler';
import { toFormikValidate } from '../util/toFormikValidate';

function AutoSaveAction({ debounceMs }: { debounceMs: number }) {
  const formik = useFormikContext();
  const scheduler = useScheduler(debounceMs, () => formik.submitForm());

  function emergencySave() {
    if (scheduler.isRunning) {
      scheduler.run();
    }
  }

  useEffect(() => {
    if (formik.dirty) {
      scheduler.restart();
    }
  }, [JSON.stringify(formik.values)]);

  // This emergency save doesn't work
  useEffect(() => {
    window.addEventListener('beforeunload', emergencySave);
    return () => window.removeEventListener('beforeunload', emergencySave);
  }, []);

  return null;
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
            <AutoSaveAction debounceMs={delayMs} />
            {typeof children === 'function' ? children(formikBag) : children}
          </Form>
        );
      }}
    </Formik>
  );
}
