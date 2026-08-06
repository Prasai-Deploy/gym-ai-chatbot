import React from 'react';
import { StatCard } from '../components/StatCard';
import { Users, Shield, Zap, AlertTriangle } from '../icons';

export interface MemberStatsProps {
  totalMembers?: number;
  activePct?: number;
  avgTenureMo?: number;
  churnRiskCount?: number;
  className?: string;
}

export const MemberStats: React.FC<MemberStatsProps> = React.memo(({
  totalMembers = 1240,
  activePct = 95.1,
  avgTenureMo = 14.2,
  churnRiskCount = 14,
  className,
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-4 gap-3 select-none ${className}`}>
      <StatCard
        title="Total Active Roster"
        value={totalMembers.toLocaleString()}
        unit="members"
        icon={<Users className="w-5 h-5 text-indigo-400" />}
        trend={{ value: '+48 this month', isPositive: true }}
        variant="primary"
      />
      <StatCard
        title="Active Compliance Rate"
        value={`${activePct}%`}
        unit="active"
        icon={<Shield className="w-5 h-5 text-emerald-400" />}
        trend={{ value: 'Top 2% SaaS benchmark', isPositive: true }}
        variant="default"
      />
      <StatCard
        title="Average Member Tenure"
        value={avgTenureMo}
        unit="months"
        icon={<Zap className="w-5 h-5 text-amber-400" />}
        trend={{ value: '+2.1 mo YoY', isPositive: true }}
        variant="default"
      />
      <StatCard
        title="Flagged Churn Risk"
        value={churnRiskCount}
        unit="alerts"
        icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
        trend={{ value: '1.4% Monthly Churn', isPositive: true }}
        variant="default"
      />
    </div>
  );
});

MemberStats.displayName = 'MemberStats';
