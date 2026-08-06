import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../tokens';
import { RefreshCw } from '../icons';

export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'ghost' 
  | 'outline' 
  | 'danger' 
  | 'success' 
  | 'premium' 
  | 'disabled';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}, ref) => {
  const isDisabled = disabled || isLoading || variant === 'disabled';

  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
    md: 'px-4 py-2.5 text-sm gap-2 rounded-xl',
    lg: 'px-6 py-3.5 text-base gap-2.5 rounded-2xl',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-lg shadow-orange-500/25 border border-orange-400/30',
    secondary: 'bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white border border-white/10 shadow-sm',
    ghost: 'bg-transparent hover:bg-white/10 active:bg-white/15 text-slate-300 hover:text-white',
    outline: 'bg-transparent border border-white/20 hover:border-orange-500/50 hover:bg-orange-500/10 text-white',
    danger: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-lg shadow-red-500/25 border border-red-400/30',
    success: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/30',
    premium: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-orange-500 hover:opacity-95 text-white font-bold shadow-lg shadow-indigo-500/30 border border-white/20',
    disabled: 'bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed shadow-none',
  };

  return (
    <motion.button
      ref={ref}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      disabled={isDisabled}
      aria-busy={isLoading}
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {isLoading ? (
        <RefreshCw className="w-4 h-4 animate-spin text-current" aria-hidden="true" />
      ) : leftIcon ? (
        <span className="inline-flex shrink-0">{leftIcon}</span>
      ) : null}

      <span>{children}</span>

      {!isLoading && rightIcon && (
        <span className="inline-flex shrink-0">{rightIcon}</span>
      )}
    </motion.button>
  );
});

Button.displayName = 'Button';
