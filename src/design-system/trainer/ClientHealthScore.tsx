import React from 'react';
import { Badge } from '../components/Badge';

export interface ClientHealthScoreProps {
  score: number;
  label?: string;
  className?: string;
}

export const ClientHealthScore: React.FC<ClientHealthScoreProps> = React.memo(({
  score,
  label = 'Adherence',
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

ClientHealthScore.displayName = 'ClientHealthScore';
