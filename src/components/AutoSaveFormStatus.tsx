import { Icon } from '@chakra-ui/react';
import { useFormikContext } from 'formik';
import React, { useContext } from 'react';
import { FaCheck, FaClock, FaSpinner, FaTimes } from 'react-icons/fa';
import { AutoSaveContext } from './AutoSaveForm';

export function AutoSaveFormStatus() {
  const state = useContext(AutoSaveContext);
  const formik = useFormikContext();

  if (Object.keys(formik.errors).length > 0) {
    return <Icon as={FaTimes} color="red" />;
  }

  if (state === 'idle') {
    return <Icon as={FaCheck} color="green" />;
  }

  if (state === 'submitting') {
    return <Icon as={FaSpinner} color="yellow" />;
  }

  if (state === 'scheduled') {
    return <Icon as={FaClock} color="blue" />;
  }

  return null;
}
