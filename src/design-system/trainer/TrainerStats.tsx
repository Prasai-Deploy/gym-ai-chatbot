import React from 'react';
import { StatCard } from '../components/StatCard';
import { Clock, Users, DollarSign, Award } from '../icons';

export interface TrainerStatsProps {
  ptHoursLogged?: number;
  clientRetentionPct?: number;
  monthlyEarnings?: number;
  avgRating?: number;
  className?: string;
}

export const TrainerStats: React.FC<TrainerStatsProps> = React.memo(({
  ptHoursLogged = 124,
  clientRetentionPct = 96.4,
  monthlyEarnings = 8450,
  avgRating = 4.9,
  className,
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-4 gap-3 select-none ${className}`}>
      <StatCard
        title="PT Hours Logged"
        value={ptHoursLogged}
        unit="hrs"
        icon={<Clock className="w-5 h-5 text-indigo-400" />}
        trend={{ value: '+14 hrs vs last mo', isPositive: true }}
        variant="primary"
      />
      <StatCard
        title="Client Retention"
        value={`${clientRetentionPct}%`}
        unit="retention"
        icon={<Users className="w-5 h-5 text-emerald-400" />}
        trend={{ value: 'Top Trainer Rank', isPositive: true }}
        variant="default"
      />
      <StatCard
        title="Monthly PT Revenue"
        value={`$${monthlyEarnings.toLocaleString()}`}
        unit="earnings"
        icon={<DollarSign className="w-5 h-5 text-amber-400" />}
        trend={{ value: '+$1,200 vs target', isPositive: true }}
        variant="default"
      />
      <StatCard
        title="Client Satisfaction"
        value={avgRating}
        unit="/ 5.0 ⭐"
        icon={<Award className="w-5 h-5 text-amber-400" />}
        trend={{ value: '48 Reviews', isPositive: true }}
        variant="default"
      />
    </div>
  );
});

TrainerStats.displayName = 'TrainerStats';
