import React from 'react';
import { StatCard } from '../components/StatCard';
import { CreditCard, TrendingUp, DollarSign } from '../icons';

export interface RevenueCardProps {
  mrrAmount?: number;
  arpuAmount?: number;
  grossAnnualArr?: number;
  className?: string;
}

export const RevenueCard: React.FC<RevenueCardProps> = React.memo(({
  mrrAmount = 48250,
  arpuAmount = 125,
  grossAnnualArr = 579000,
  className,
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 select-none ${className}`}>
      <StatCard
        title="Monthly Recurring Revenue"
        value={`$${mrrAmount.toLocaleString()}`}
        unit="MRR"
        icon={<CreditCard className="w-5 h-5 text-amber-400" />}
        trend={{ value: '+8.4% MoM', isPositive: true }}
        variant="primary"
      />
      <StatCard
        title="Avg. Revenue Per User"
        value={`$${arpuAmount}`}
        unit="ARPU"
        icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
        trend={{ value: '+$5.20 vs avg', isPositive: true }}
        variant="default"
      />
      <StatCard
        title="Annual Run Rate (ARR)"
        value={`$${(grossAnnualArr / 1000).toFixed(0)}k`}
        unit="ARR"
        icon={<TrendingUp className="w-5 h-5 text-indigo-400" />}
        trend={{ value: '+12.1% YoY', isPositive: true }}
        variant="default"
      />
    </div>
  );
});

RevenueCard.displayName = 'RevenueCard';
