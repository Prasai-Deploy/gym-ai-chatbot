import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { ExternalLink } from '../icons';

export interface PayoutCenterProps {
  nextPayoutAmount?: number;
  nextPayoutDate?: string;
  clearedBalance?: number;
  className?: string;
}

export const PayoutCenter: React.FC<PayoutCenterProps> = React.memo(({
  nextPayoutAmount = 14850,
  nextPayoutDate = 'Tomorrow 09:00 AM',
  clearedBalance = 2410,
  className,
}) => {
  return (
    <Card variant="glass" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Stripe Merchant Payout Balance</span>
        <Badge variant="success" size="sm">Cleared Balance</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-400">Next Scheduled Payout</span>
          <span className="text-lg font-black font-mono text-emerald-400">${nextPayoutAmount.toLocaleString()}</span>
          <span className="text-[10px] text-slate-400">{nextPayoutDate}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-400">Pending Cleared Funds</span>
          <span className="text-lg font-black font-mono text-white">${clearedBalance.toLocaleString()}</span>
          <span className="text-[10px] text-slate-400">Arriving in 2 days</span>
        </div>
      </div>
    </Card>
  );
});

PayoutCenter.displayName = 'PayoutCenter';
