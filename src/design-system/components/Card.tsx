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
    default: 'bg-[#11141D] border border-white/[0.07] shadow-sm',
    glass: 'backdrop-blur-xl bg-[#11141D]/80 border border-white/[0.09] shadow-lg',
    premium: 'bg-gradient-to-br from-[#11141D] via-indigo-950/30 to-[#11141D] border border-indigo-500/25 shadow-indigo-500/5 shadow-xl',
    workout: 'bg-[#11141D] border border-orange-500/25 hover:border-orange-500/40',
    nutrition: 'bg-[#11141D] border border-emerald-500/25 hover:border-emerald-500/40',
    coach: 'bg-[#11141D] border border-indigo-500/25 hover:border-indigo-500/40',
    analytics: 'bg-[#11141D] border border-cyan-500/25 hover:border-cyan-500/40',
    gym: 'bg-[#11141D] border border-amber-500/25 hover:border-amber-500/40',
  };

  return (
    <motion.div
      whileHover={interactive ? { y: -2, transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] } } : undefined}
      className={cn(
        'rounded-2xl p-6 transition-all duration-200 overflow-hidden relative',
        variantStyles[variant],
        interactive && 'cursor-pointer hover:border-white/[0.18]',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};
