import React from 'react';
import { StatCard } from '../components/StatCard';
import { DollarSign } from '../icons';

export interface MRRCardProps {
  mrr?: number;
  growthPct?: number;
  className?: string;
}

export const MRRCard: React.FC<MRRCardProps> = React.memo(({
  mrr = 48250,
  growthPct = 8.4,
  className,
}) => {
  return (
    <StatCard
      title="Monthly Recurring Revenue"
      value={`$${mrr.toLocaleString()}`}
      unit="/mo"
      icon={<DollarSign className="w-5 h-5 text-amber-400" />}
      trend={{ value: `+${growthPct}% Net MRR Growth`, isPositive: true }}
      variant="primary"
      className={className}
    />
  );
});

MRRCard.displayName = 'MRRCard';
