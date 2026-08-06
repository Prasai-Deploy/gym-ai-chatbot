import React from 'react';
import { Badge } from '../components/Badge';

export interface HealthScoreProps {
  score: number;
  label?: string;
  className?: string;
}

export const HealthScore: React.FC<HealthScoreProps> = React.memo(({
  score,
  label = 'Score',
  className,
}) => {
  const getVariant = (val: number) => {
    if (val >= 90) return 'success';
    if (val >= 75) return 'primary';
    if (val >= 60) return 'warning';
    return 'danger';
  };

  return (
    <Badge variant={getVariant(score)} size="sm" className={className}>
      {label}: {score}%
    </Badge>
  );
});

HealthScore.displayName = 'HealthScore';
