import React from 'react';
import { Button, ButtonProps } from './Button';
import { Loader2 } from 'lucide-react';

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ children, loading, loadingText, disabled, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={loading || disabled}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading && loadingText ? loadingText : children}
      </Button>
    );
  }
);
LoadingButton.displayName = 'LoadingButton';
