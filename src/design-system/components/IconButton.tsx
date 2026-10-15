import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../tokens';

export interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  icon: React.ReactNode;
  'aria-label': string;
  variant?: 'primary' | 'action' | 'lime' | 'ai' | 'secondary' | 'ghost' | 'outline' | 'danger';
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
    sm: 'w-8 h-8 min-w-[32px] min-h-[32px] text-xs rounded-lg',
    md: 'w-10 h-10 min-w-[40px] min-h-[40px] text-sm rounded-xl',
    lg: 'w-12 h-12 min-w-[48px] min-h-[48px] text-base rounded-2xl',
  };

  const variantStyles = {
    primary: 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 focus-visible:ring-orange-500',
    action: 'bg-[#84CC16] hover:bg-[#A3E635] text-[#050608] shadow-md shadow-lime-500/20 border border-lime-400/40 focus-visible:ring-lime-400',
    lime: 'bg-[#84CC16] hover:bg-[#A3E635] text-[#050608] shadow-md shadow-lime-500/20 border border-lime-400/40 focus-visible:ring-lime-400',
    ai: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/30 focus-visible:ring-indigo-400',
    secondary: 'bg-[#181C28] hover:bg-[#1F2433] text-white border border-white/10 focus-visible:ring-slate-400',
    ghost: 'bg-transparent hover:bg-white/10 text-slate-400 hover:text-white focus-visible:ring-slate-400',
    outline: 'bg-transparent border border-white/20 hover:border-white/40 text-white focus-visible:ring-slate-400',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 focus-visible:ring-red-500',
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
