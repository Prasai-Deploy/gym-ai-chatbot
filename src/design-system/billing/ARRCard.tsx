import React from 'react';
import { StatCard } from '../components/StatCard';
import { TrendingUp } from '../icons';

export interface ARRCardProps {
  arr?: number;
  className?: string;
}

export const ARRCard: React.FC<ARRCardProps> = React.memo(({
  arr = 579000,
  className,
}) => {
  return (
    <StatCard
      title="Annual Recurring Run Rate"
      value={`$${arr.toLocaleString()}`}
      unit="ARR"
      icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
      trend={{ value: '+$45,000 YoY Expansion', isPositive: true }}
      variant="default"
      className={className}
    />
  );
});

ARRCard.displayName = 'ARRCard';
