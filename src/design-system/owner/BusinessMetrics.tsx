import React from 'react';
import { StatCard } from '../components/StatCard';
import { TrendingUp, Users, Award, Zap } from '../icons';

export interface BusinessMetricsProps {
  cacAmount?: number;
  ltvAmount?: number;
  retentionRatePct?: number;
  npsScore?: number;
  className?: string;
}

export const BusinessMetrics: React.FC<BusinessMetricsProps> = React.memo(({
  cacAmount = 45,
  ltvAmount = 1850,
  retentionRatePct = 96.2,
  npsScore = 78,
  className,
}) => {
  const ltvCacRatio = (ltvAmount / cacAmount).toFixed(1);

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-4 gap-3 select-none ${className}`}>
      <StatCard
        title="Customer Acq. Cost (CAC)"
        value={`$${cacAmount}`}
        unit="CAC"
        icon={<Users className="w-5 h-5 text-orange-400" />}
        trend={{ value: 'Low Acquisition Cost', isPositive: true }}
        variant="default"
      />
      <StatCard
        title="Lifetime Value (LTV)"
        value={`$${ltvAmount}`}
        unit="LTV"
        icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
        trend={{ value: `${ltvCacRatio}x LTV/CAC Ratio`, isPositive: true }}
        variant="primary"
      />
      <StatCard
        title="Retention Rate"
        value={`${retentionRatePct}%`}
        unit="retention"
        icon={<Zap className="w-5 h-5 text-indigo-400" />}
        trend={{ value: 'Top 1% SaaS Benchmarks', isPositive: true }}
        variant="default"
      />
      <StatCard
        title="Net Promoter Score"
        value={npsScore}
        unit="NPS"
        icon={<Award className="w-5 h-5 text-amber-400" />}
        trend={{ value: 'World-Class Loyalty', isPositive: true }}
        variant="default"
      />
    </div>
  );
});

BusinessMetrics.displayName = 'BusinessMetrics';
