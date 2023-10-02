import { Center, Spinner } from '@chakra-ui/react';

export function Loading() {
  return (
    <Center h="100%" w="100%">
      <Spinner />
    </Center>
  );
}
