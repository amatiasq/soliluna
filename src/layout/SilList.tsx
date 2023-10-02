import {
  Heading,
  HStack,
  Icon,
  IconButton,
  StackDivider,
  VStack,
} from '@chakra-ui/react';
import { PropsWithChildren } from 'react';
import { FaPlus } from 'react-icons/fa';

interface SilListProps {
  title: string;
  addLabel: string;
  add: () => any;
}

export function SilList({
  children,
  title,
  addLabel,
  add,
}: PropsWithChildren<SilListProps>) {
  return (
    <>
      <HStack mb={10}>
        <Heading as="h1" flex={1}>
          {title}
        </Heading>
        <IconButton
          title={addLabel}
          aria-label={addLabel}
          icon={<Icon as={FaPlus} />}
          colorScheme="green"
          onClick={add}
        />
      </HStack>
      <VStack
        align="stretch"
        gap="var(--chakra-space-4)"
        divider={<StackDivider borderColor="gray.200" />}
      >
        {children}
      </VStack>
    </>
  );
}
