import { Input } from '@chakra-ui/react';
import { withProps } from '../util/withProps';

export const NumberInput = withProps(Input, { type: 'number' });
