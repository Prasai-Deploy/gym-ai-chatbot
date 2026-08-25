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
    orange: 'shadow-[0_0_24px_rgba(249,115,22,0.14)] border-orange-500/25',
    indigo: 'shadow-[0_0_24px_rgba(99,102,241,0.14)] border-indigo-500/25',
    emerald: 'shadow-[0_0_20px_rgba(16,185,129,0.14)] border-emerald-500/25',
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
