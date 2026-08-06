import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

export interface PlanRevenue {
  planName: string;
  sharePct: number;
  monthlyRevenue: number;
}

export interface RevenueByPlanProps {
  plans?: PlanRevenue[];
  className?: string;
}

export const RevenueByPlan: React.FC<RevenueByPlanProps> = React.memo(({
  plans = [
    { planName: 'Gold Pro Plan ($125/mo)', sharePct: 56, monthlyRevenue: 26900 },
    { planName: 'Standard Pass ($79/mo)', sharePct: 24, monthlyRevenue: 11500 },
    { planName: 'VIP Unlimited ($249/mo)', sharePct: 20, monthlyRevenue: 9850 },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Revenue Breakdown By Membership Tier</span>
        <Badge variant="success" size="sm">3 Active Tiers</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {plans.map((p, idx) => (
          <div key={idx} className="p-3 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between text-xs">
            <div className="flex flex-col">
              <span className="font-bold text-white">{p.planName}</span>
              <span className="text-[10px] text-slate-400">{p.sharePct}% Revenue Share</span>
            </div>
            <span className="font-mono font-extrabold text-emerald-400">${p.monthlyRevenue.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </Card>
  );
});

RevenueByPlan.displayName = 'RevenueByPlan';
