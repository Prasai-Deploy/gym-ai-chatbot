import React from 'react';
import { cn } from '../tokens';

export type BadgeVariant = 'primary' | 'ai' | 'success' | 'warning' | 'danger' | 'neutral' | 'outline';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className,
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] gap-1 font-bold tracking-[0.10em]',
    md: 'px-2.5 py-0.5 text-[11px] gap-1.5 font-bold tracking-[0.10em]',
  };

  const variantStyles: Record<BadgeVariant, string> = {
    primary: 'bg-orange-500/[0.10] text-orange-400 border border-orange-500/25',
    ai: 'bg-indigo-500/[0.10] text-indigo-300 border border-indigo-500/25',
    success: 'bg-emerald-500/[0.10] text-emerald-400 border border-emerald-500/25',
    warning: 'bg-amber-500/[0.10] text-amber-400 border border-amber-500/25',
    danger: 'bg-red-500/[0.10] text-red-400 border border-red-500/25',
    neutral: 'bg-[#181C28] text-slate-300 border border-white/[0.08]',
    outline: 'bg-transparent text-slate-300 border border-white/[0.14]',
  };

  return (
    <span className={cn('inline-flex items-center rounded-full uppercase select-none', sizeStyles[size], variantStyles[variant], className)}>
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
