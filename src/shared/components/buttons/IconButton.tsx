import React from 'react';
import { cn } from '../../../lib/utils';
import { Button, ButtonProps } from './Button';

export const IconButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn('rounded-full', className)}
        {...props}
      />
    );
  }
);
IconButton.displayName = 'IconButton';
