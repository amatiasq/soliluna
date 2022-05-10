import { Icon } from '@chakra-ui/react';
import { useFormikContext } from 'formik';
import React from 'react';
import { FaCheck, FaClock, FaSpinner, FaTimes } from 'react-icons/fa';
import { AutoSaveContext } from '../hooks/useAutoSave';

export function AutoSaveFormStatus() {
  const formik = useFormikContext() as AutoSaveContext;

  if (Object.keys(formik.errors).length > 0) {
    return <Icon as={FaTimes} color="red" />;
  }

  if (formik.autoSaveState === 'idle') {
    return <Icon as={FaCheck} color="green" />;
  }

  if (formik.autoSaveState === 'submitting') {
    return <Icon as={FaSpinner} color="yellow" />;
  }

  if (formik.autoSaveState === 'scheduled') {
    return <Icon as={FaClock} color="blue" />;
  }

  return null;
}
