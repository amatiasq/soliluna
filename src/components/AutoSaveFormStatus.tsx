import { Icon } from '@chakra-ui/react';
import { useFormikContext } from 'formik';
import React, { useState } from 'react';
import { FaCheck, FaClock, FaSpinner, FaTimes } from 'react-icons/fa';

export function AutoSaveFormStatus() {
  const formik = useFormikContext();
  const [hasChanges, setHasChanges] = useState(false);

  formik.validate = () => {
    if (hasChanges === false) setHasChanges(true);
  };

  if (formik.isSubmitting) {
    if (hasChanges === true) setHasChanges(false);
    return <Icon as={FaSpinner} color="blue" />;
  }

  if (hasChanges) {
    return <Icon as={FaClock} color="blue" />;
  }

  if (Object.keys(formik.errors).length > 0) {
    return <Icon as={FaTimes} color="red" />;
  }

  return <Icon as={FaCheck} color="green" />;
}
