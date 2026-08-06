import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Check } from '../icons';

export interface PlanTier {
  id: string;
  name: string;
  priceMo: number;
  membersCount: number;
  features: string[];
  isPopular?: boolean;
}

export interface MembershipPlansProps {
  plans?: PlanTier[];
  onSelectPlan?: (id: string) => void;
  className?: string;
}

export const MembershipPlans: React.FC<MembershipPlansProps> = React.memo(({
  plans = [
    { id: 'p1', name: 'Standard Gym Pass', priceMo: 79, membersCount: 420, features: ['24/7 Gym Floor Access', 'Locker Room Access', 'STRIVA Member App'] },
    { id: 'p2', name: 'Gold Pro Plan', priceMo: 125, membersCount: 680, features: ['Unlimited Gym & Classes', 'AI Trinity Coach Suite', 'Sauna & Hydromassage'], isPopular: true },
    { id: 'p3', name: 'VIP Unlimited + PT', priceMo: 249, membersCount: 140, features: ['4x 1-on-1 PT Sessions/mo', 'Personal Nutrition Plan', 'Guest Pass Privileges'] },
  ],
  onSelectPlan,
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Active Membership Tiers & Pricing Matrix</span>
        <Badge variant="primary" size="sm">3 Active Tiers</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 ${
              p.isPopular ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10' : 'bg-slate-900 border-white/10'
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{p.name}</span>
                {p.isPopular && <Badge variant="warning" size="sm">Popular</Badge>}
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">${p.priceMo}</span>
                <span className="text-xs text-slate-400">/mo</span>
              </div>

              <span className="text-[10px] text-indigo-400 font-semibold">{p.membersCount} Active Members</span>

              <div className="flex flex-col gap-1.5 pt-3 border-t border-white/5 text-xs text-slate-300">
                {p.features.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[3]" />
                    <span className="text-[11px]">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button variant={p.isPopular ? 'primary' : 'secondary'} size="sm" onClick={() => onSelectPlan?.(p.id)}>
              Manage Plan
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
});

MembershipPlans.displayName = 'MembershipPlans';
