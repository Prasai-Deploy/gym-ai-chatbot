import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../tokens';
import { RefreshCw } from '../icons';

export type ButtonVariant = 
  | 'primary' 
  | 'action'
  | 'ai'
  | 'secondary' 
  | 'ghost' 
  | 'outline' 
  | 'danger' 
  | 'success' 
  | 'lime'
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

  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050608] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none select-none';

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 min-h-[36px] text-xs gap-1.5 rounded-lg font-medium',
    md: 'px-4 py-2.5 min-h-[44px] text-sm gap-2 rounded-xl font-semibold',
    lg: 'px-6 py-3 min-h-[48px] text-base gap-2.5 rounded-xl font-bold',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-sm shadow-orange-500/20 border border-orange-400/25 focus-visible:ring-orange-500',
    action: 'bg-[#84CC16] hover:bg-[#A3E635] active:bg-[#65A30D] text-[#050608] font-bold shadow-sm shadow-lime-500/20 border border-lime-400/40 focus-visible:ring-lime-400',
    ai: 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-500/25 border border-indigo-400/30 focus-visible:ring-indigo-400',
    secondary: 'bg-[#181C28] hover:bg-[#1F2433] active:bg-[#11141D] text-white border border-white/[0.08] shadow-sm focus-visible:ring-slate-400',
    ghost: 'bg-transparent hover:bg-white/[0.06] active:bg-white/[0.10] text-slate-300 hover:text-white focus-visible:ring-slate-400',
    outline: 'bg-transparent border border-white/[0.14] hover:border-lime-500/40 hover:bg-lime-500/[0.08] text-white focus-visible:ring-lime-400',
    danger: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-sm shadow-red-500/20 border border-red-400/25 focus-visible:ring-red-500',
    success: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20 border border-emerald-400/25 focus-visible:ring-emerald-500',
    lime: 'bg-[#84CC16] hover:bg-[#A3E635] active:bg-[#65A30D] text-[#050608] font-bold shadow-sm shadow-lime-500/20 border border-lime-400/40 focus-visible:ring-lime-400',
    premium: 'bg-gradient-to-r from-indigo-500/90 via-purple-500/90 to-orange-500/90 hover:opacity-95 text-white font-bold shadow-sm shadow-indigo-500/25 border border-white/[0.15] focus-visible:ring-indigo-400',
    disabled: 'bg-[#11141D] text-slate-500 border border-white/[0.05] cursor-not-allowed shadow-none',
  };

  return (
    <motion.button
      ref={ref}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
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
