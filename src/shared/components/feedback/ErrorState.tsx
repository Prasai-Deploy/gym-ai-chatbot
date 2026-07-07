import React from 'react';
import { cn } from '../../../lib/utils';
import { AlertCircle } from 'lucide-react';
import { Button } from '../buttons';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  error?: Error | string | null;
  onRetry?: () => void;
}

export const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  ({ className, title = 'Something went wrong', error, onRetry, ...props }, ref) => {
    const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : null;

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center p-6 text-center bg-red-500/10 border border-red-500/20 rounded-2xl',
          className
        )}
        {...props}
      >
        <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
        {errorMessage && <p className="text-sm text-red-400 mb-4">{errorMessage}</p>}
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300">
            Try Again
          </Button>
        )}
      </div>
    );
  }
);
ErrorState.displayName = 'ErrorState';
