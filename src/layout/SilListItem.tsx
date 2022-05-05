import { Flex, Grid, GridItem, Heading, Tag } from '@chakra-ui/react';
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
    <Grid
      templateColumns="1fr auto auto"
      gap="var(--chakra-space-2)"
      rowGap="var(--chakra-space-4)"
    >
      <Heading as="h3" fontSize="1.5rem">
        <LinkOverlay to={url}>{name}</LinkOverlay>
      </Heading>

      <Tag>{tag}</Tag>

      <DeleteButton label={removeLabel} onConfirm={remove} />

      <GridItem colSpan={3}>
        <Flex whiteSpace="nowrap" flexWrap="wrap" gap="var(--chakra-space-2)">
          {children}
        </Flex>
      </GridItem>
    </Grid>
  );
}
