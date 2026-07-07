import React from 'react';
import { cn } from '../../../lib/utils';
import { motion, HTMLMotionProps } from 'motion/react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-60 disabled:pointer-events-none',
          {
            // Variants
            'btn-primary shadow-xl': variant === 'primary',
            'btn-secondary': variant === 'secondary',
            'border border-border-subtle bg-transparent hover:bg-surface-elevated text-text-primary': variant === 'outline',
            'bg-transparent hover:bg-surface-elevated text-text-primary': variant === 'ghost',
            'bg-red-500 text-white hover:bg-red-600': variant === 'danger',
            
            // Sizes
            'h-9 px-4 text-sm': size === 'sm',
            'h-11 px-6 text-base': size === 'md',
            'h-14 px-8 text-lg rounded-2xl': size === 'lg',
            'h-11 w-11': size === 'icon',

            // Width
            'w-full': fullWidth,
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
