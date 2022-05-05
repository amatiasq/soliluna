import { Flex, Grid, Heading, LinkBox, Tag, VStack } from '@chakra-ui/react';
import React, { PropsWithChildren } from 'react';
import { DeleteButton } from '../components/DeleteButton';
import { LinkOverlay } from '../components/Link';

interface SilListItemProps {
  name: string;
  remove: () => unknown;
  removeLabel: string;
  tag: string;
  url: string;
}

export function SilListItem({
  children,
  name,
  remove,
  removeLabel,
  tag,
  url,
}: PropsWithChildren<SilListItemProps>) {
  return (
    <VStack align="stretch" gap="var(--chakra-space-4)" role="group">
      <LinkBox
        as={Grid}
        templateColumns="1fr auto auto"
        gap="var(--chakra-space-2)"
      >
        <Heading
          as="h3"
          fontSize="1.5rem"
          transition="transform 0.125s ease-out"
          _groupHover={{ transform: 'translateX(0.3rem)' }}
        >
          <LinkOverlay to={url}>{name}</LinkOverlay>
        </Heading>

        <Tag variant="solid" cursor="default">
          {tag}
        </Tag>

        <DeleteButton label={removeLabel} onConfirm={remove} />
      </LinkBox>

      <Flex whiteSpace="nowrap" flexWrap="wrap" gap="var(--chakra-space-2)">
        {children}
      </Flex>
    </VStack>
  );
}
