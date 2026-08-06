import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../tokens';

export interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  icon: React.ReactNode;
  'aria-label': string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon,
  'aria-label': ariaLabel,
  variant = 'ghost',
  size = 'md',
  className,
  disabled,
  ...props
}, ref) => {
  const sizeStyles = {
    sm: 'w-8 h-8 text-xs rounded-lg',
    md: 'w-10 h-10 text-sm rounded-xl',
    lg: 'w-12 h-12 text-base rounded-2xl',
  };

  const variantStyles = {
    primary: 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10',
    ghost: 'bg-transparent hover:bg-white/10 text-slate-400 hover:text-white',
    outline: 'bg-transparent border border-white/20 hover:border-white/40 text-white',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20',
  };

  return (
    <motion.button
      ref={ref}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50 disabled:pointer-events-none',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icon}
    </motion.button>
  );
});

IconButton.displayName = 'IconButton';
