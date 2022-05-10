import { Form, Formik, FormikConfig, FormikValues } from 'formik';
import React, { useEffect } from 'react';
import { useAutoSave } from '../hooks/useAutoSave';
import { useScheduler } from '../hooks/useScheduler';
import { toFormikValidate } from '../util/toFormikValidate';

function AutoSaveAction({ debounceMs }: { debounceMs: number }) {
  const formik = useAutoSave();

  if (!formik.autoSaveState) {
    formik.autoSaveState = 'idle';
  }

  const scheduler = useScheduler(debounceMs, () => {
    formik.autoSaveState = 'submitting';
    if (formik.isValid) {
      formik.submitForm();
    }
  });

  function emergencySave() {
    if (scheduler.isRunning) {
      scheduler.run();
    }
  }

  if (formik.autoSaveState === 'submitting' && !formik.isSubmitting) {
    formik.autoSaveState = 'idle';
  }

  useEffect(() => {
    if (formik.isValidating) {
      formik.autoSaveState = 'scheduled';
      scheduler.restart();
    }
  }, [formik.isValidating]);

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
