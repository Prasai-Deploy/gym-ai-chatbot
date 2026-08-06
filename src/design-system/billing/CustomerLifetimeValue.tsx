import React from 'react';
import { StatCard } from '../components/StatCard';
import { Award } from '../icons';

export interface CustomerLifetimeValueProps {
  ltv?: number;
  cacRatio?: string;
  className?: string;
}

export const CustomerLifetimeValue: React.FC<CustomerLifetimeValueProps> = React.memo(({
  ltv = 1840,
  cacRatio = '4.8x LTV:CAC',
  className,
}) => {
  return (
    <StatCard
      title="Member Lifetime Value (LTV)"
      value={`$${ltv.toLocaleString()}`}
      unit="/ member"
      icon={<Award className="w-5 h-5 text-indigo-400" />}
      trend={{ value: cacRatio, isPositive: true }}
      variant="default"
      className={className}
    />
  );
});

CustomerLifetimeValue.displayName = 'CustomerLifetimeValue';
