import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../tokens';

export type CardVariant = 
  | 'default' 
  | 'glass' 
  | 'premium' 
  | 'workout' 
  | 'nutrition' 
  | 'coach' 
  | 'analytics' 
  | 'gym';

export interface CardProps extends HTMLMotionProps<'div'> {
  variant?: CardVariant;
  interactive?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  interactive = false,
  children,
  className,
  ...props
}) => {
  const variantStyles: Record<CardVariant, string> = {
    default: 'bg-slate-900/88 border border-white/10 shadow-[var(--shadow-float)]',
    glass: 'glass-panel',
    premium: 'bg-indigo-500/10 border border-indigo-500/25 shadow-[var(--shadow-float)]',
    workout: 'bg-slate-900/88 border border-brand-500/25 shadow-[var(--shadow-float)]',
    nutrition: 'bg-slate-900/88 border border-emerald-500/25 shadow-[var(--shadow-float)]',
    coach: 'bg-slate-900/88 border border-indigo-500/25 shadow-[var(--shadow-float)]',
    analytics: 'bg-slate-900/88 border border-cyan-500/25 shadow-[var(--shadow-float)]',
    gym: 'bg-slate-900/88 border border-amber-500/25 shadow-[var(--shadow-float)]',
  };

  return (
    <motion.div
      whileHover={interactive ? { y: -2, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } } : undefined}
      className={cn(
        'rounded-[26px] p-5 sm:p-6 transition-all duration-200 overflow-hidden relative',
        variantStyles[variant],
        interactive && 'cursor-pointer hover:border-white/30',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};
