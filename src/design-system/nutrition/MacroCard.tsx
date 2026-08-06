import React from 'react';
import { MetricCard } from '../components/MetricCard';

export interface MacroCardProps {
  label: string;
  currentGrams: number;
  targetGrams: number;
  variant?: 'primary' | 'ai' | 'success';
  className?: string;
}

export const MacroCard: React.FC<MacroCardProps> = React.memo(({
  label,
  currentGrams,
  targetGrams,
  variant = 'primary',
  className,
}) => {
  return (
    <MetricCard
      label={label}
      currentValue={currentGrams}
      targetValue={targetGrams}
      unit="g"
      variant={variant}
      className={className}
    />
  );
});

MacroCard.displayName = 'MacroCard';
