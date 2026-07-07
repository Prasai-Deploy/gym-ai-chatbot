import React from 'react';
import { cn } from '../../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="flex flex-col w-full">
        {label && (
          <label className="mb-2 text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'flex h-12 w-full rounded-xl border border-border-subtle bg-surface-input px-4 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:outline-none focus:border-border-focus disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        {helperText && !error && <p className="mt-1.5 text-xs text-text-muted">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
