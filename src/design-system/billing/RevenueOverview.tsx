import React from 'react';
import { MRRCard } from './MRRCard';
import { ARRCard } from './ARRCard';
import { CustomerLifetimeValue } from './CustomerLifetimeValue';
import { StatCard } from '../components/StatCard';
import { Shield } from '../icons';

export interface RevenueOverviewProps {
  className?: string;
}

export const RevenueOverview: React.FC<RevenueOverviewProps> = React.memo(({
  className,
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-4 gap-3 select-none ${className}`}>
      <MRRCard mrr={48250} growthPct={8.4} />
      <ARRCard arr={579000} />
      <CustomerLifetimeValue ltv={1840} cacRatio="4.8x LTV:CAC" />
      <StatCard
        title="Payment Success Rate"
        value="98.2%"
        unit="collected"
        icon={<Shield className="w-5 h-5 text-emerald-400" />}
        trend={{ value: '1.8% Delinquency', isPositive: true }}
        variant="default"
      />
    </div>
  );
});

RevenueOverview.displayName = 'RevenueOverview';
