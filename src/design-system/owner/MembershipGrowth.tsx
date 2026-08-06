import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Users, TrendingUp } from '../icons';

export interface GrowthPoint {
  month: string;
  signups: number;
  cancellations: number;
}

export interface MembershipGrowthProps {
  growthData?: GrowthPoint[];
  className?: string;
}

export const MembershipGrowth: React.FC<MembershipGrowthProps> = React.memo(({
  growthData = [
    { month: 'Mar', signups: 54, cancellations: 12 },
    { month: 'Apr', signups: 62, cancellations: 10 },
    { month: 'May', signups: 58, cancellations: 14 },
    { month: 'Jun', signups: 68, cancellations: 11 },
    { month: 'Jul', signups: 72, cancellations: 9 },
  ],
  className,
}) => {
  return (
    <Card variant="glass" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Member Acquisition vs Churn</span>
        </div>
        <Badge variant="success" size="sm">+63 Net Growth (Jul)</Badge>
      </div>

      <div className="flex items-center justify-around gap-2 pt-2 border-b border-white/5 pb-2 text-xs font-semibold">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>New Signups</span>
        </div>
        <div className="flex items-center gap-1.5 text-red-400">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Cancellations</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        {growthData.map((gd, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="font-bold text-white uppercase font-mono">{gd.month}</span>
            <div className="flex items-center gap-4">
              <span className="font-bold text-emerald-400">+{gd.signups} Signups</span>
              <span className="font-bold text-red-400">-{gd.cancellations} Churn</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

MembershipGrowth.displayName = 'MembershipGrowth';
