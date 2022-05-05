import {
  Link as ChakraLink,
  LinkOverlay as ChakraLinkOverlay,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { withProps } from '../util/withProps';

export const Link = withProps(ChakraLink, {
  as: RouterLink,
  // px: 2,
  // py: 1,
  // rounded: 'md',
  // _hover: {
  //   textDecoration: 'none',
  //   bg: 'gray.200',
  // },
});

export const LinkOverlay = withProps(ChakraLinkOverlay, {
  as: RouterLink,
});
