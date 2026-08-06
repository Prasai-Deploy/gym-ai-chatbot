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
    default: 'bg-slate-900/80 border border-white/10 shadow-lg',
    glass: 'backdrop-blur-xl bg-slate-900/60 border border-white/15 shadow-xl',
    premium: 'bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-indigo-500/10 shadow-2xl',
    workout: 'bg-slate-900/90 border border-orange-500/30 shadow-orange-500/5',
    nutrition: 'bg-slate-900/90 border border-emerald-500/30 shadow-emerald-500/5',
    coach: 'bg-slate-900/90 border border-indigo-500/30 shadow-indigo-500/5',
    analytics: 'bg-slate-900/90 border border-cyan-500/30 shadow-cyan-500/5',
    gym: 'bg-slate-900/90 border border-amber-500/30 shadow-amber-500/5',
  };

  return (
    <motion.div
      whileHover={interactive ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={cn(
        'rounded-3xl p-6 transition-all duration-200 overflow-hidden relative',
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
