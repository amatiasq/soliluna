import {
  Flex,
  Grid,
  Heading,
  HStack,
  LinkBox,
  Tag,
  VStack,
} from '@chakra-ui/react';
import { PropsWithChildren } from 'react';
import { DeleteButton } from '../components/DeleteButton';
import { LinkOverlay } from '../components/Link';

interface SilListItemProps {
  name: string;
  remove: () => unknown;
  removeLabel: string;
  tag: string | string[];
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
  const tags = Array.isArray(tag) ? tag : [tag];

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
          <LinkOverlay
            // "to" is a property of RouterLink (embeded in Link)
            // Chakra knows that but for some reason typescript complains
            // @ts-ignore see above
            to={url}
          >
            {name}
          </LinkOverlay>
        </Heading>

        <HStack>
          {tags.filter(Boolean).map((x) => (
            <Tag key={x} variant="solid" cursor="default">
              {x}
            </Tag>
          ))}
        </HStack>

        <DeleteButton label={removeLabel} onConfirm={remove} />
      </LinkBox>

      <Flex whiteSpace="nowrap" flexWrap="wrap" gap="var(--chakra-space-2)">
        {children}
      </Flex>
    </VStack>
  );
}
