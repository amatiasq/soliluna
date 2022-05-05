import { forwardRef, Tag, TagProps, Tooltip } from '@chakra-ui/react';
import React from 'react';

const random = () => Math.random() * 6 - 3;

interface NiceTagProps extends TagProps {
  tooltip?: string;
}

export const NiceTag = forwardRef<NiceTagProps, 'div'>(
  ({ tooltip, children, ...props }, ref) => {
    const content = tooltip ? (
      <Tooltip label={tooltip}>{children}</Tooltip>
    ) : (
      children
    );

    return (
      <Tag
        {...props}
        ref={ref}
        cursor="default"
        _hover={{
          transform: `scale(1.1) rotate(${random()}deg)`,
        }}
      >
        {content}
      </Tag>
    );
  }
);
