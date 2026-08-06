import React from 'react';
import { StatCard } from '../components/StatCard';
import { Users, User, Shield } from '../icons';

export interface MembershipCardProps {
  totalMembers?: number;
  newThisMonth?: number;
  churnRatePct?: number;
  className?: string;
}

export const MembershipCard: React.FC<MembershipCardProps> = React.memo(({
  totalMembers = 1240,
  newThisMonth = 48,
  churnRatePct = 1.4,
  className,
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 select-none ${className}`}>
      <StatCard
        title="Active Memberships"
        value={totalMembers.toLocaleString()}
        unit="members"
        icon={<Users className="w-5 h-5 text-amber-400" />}
        trend={{ value: `+${newThisMonth} new this month`, isPositive: true }}
        variant="primary"
      />
      <StatCard
        title="Monthly Churn Rate"
        value={`${churnRatePct}%`}
        unit="churn"
        icon={<Shield className="w-5 h-5 text-emerald-400" />}
        trend={{ value: 'Industry Low', isPositive: true }}
        variant="default"
      />
      <StatCard
        title="Net Member Growth"
        value={`+${newThisMonth - 8}`}
        unit="net"
        icon={<User className="w-5 h-5 text-indigo-400" />}
        trend={{ value: '+3.2% growth', isPositive: true }}
        variant="default"
      />
    </div>
  );
});

MembershipCard.displayName = 'MembershipCard';
