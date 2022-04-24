import { Center, Spinner } from '@chakra-ui/react';
import React from 'react';

export function Loading() {
  return (
    <Center h="100%" w="100%">
      <Spinner />
    </Center>
  );
}
