import React from 'react';
import { Card, CardProps } from './Card';
import { cn } from '../tokens';

export interface GlassCardProps extends Omit<CardProps, 'variant'> {
  glowColor?: 'orange' | 'indigo' | 'emerald' | 'none';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  glowColor = 'none',
  className,
  children,
  ...props
}) => {
  const glowStyles = {
    none: '',
    orange: 'shadow-[0_0_40px_rgba(249,115,22,0.15)] border-brand-500/30',
    indigo: 'shadow-[0_0_40px_rgba(99,102,241,0.15)] border-indigo-500/30',
    emerald: 'shadow-[0_0_40px_rgba(16,185,129,0.15)] border-emerald-500/30',
  };

  return (
    <Card
      variant="glass"
      className={cn(glowStyles[glowColor], className)}
      {...props}
    >
      {children}
    </Card>
  );
};
