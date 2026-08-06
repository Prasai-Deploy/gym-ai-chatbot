import React from 'react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';

export interface RenewalMemberItem {
  id: string;
  name: string;
  planName: string;
  amount: number;
  renewDate: string;
}

export interface UpcomingRenewalsProps {
  items?: RenewalMemberItem[];
  onRemind?: (id: string) => void;
  className?: string;
}

export const UpcomingRenewals: React.FC<UpcomingRenewalsProps> = React.memo(({
  items = [
    { id: '1', name: 'Marcus Vance', planName: 'VIP Unlimited', amount: 249, renewDate: 'Tomorrow' },
    { id: '2', name: 'Sarah Jenkins', planName: 'Gold Pro Plan', amount: 125, renewDate: 'Aug 08' },
    { id: '3', name: 'Samantha Reed', planName: 'Gold Pro Plan', amount: 125, renewDate: 'Aug 10' },
  ],
  onRemind,
  className,
}) => {
  return (
    <div className={`flex flex-col gap-2.5 select-none ${className}`}>
      {items.map((it) => (
        <div key={it.id} className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between gap-3 text-xs">
          <div className="flex flex-col">
            <span className="font-bold text-white">{it.name}</span>
            <span className="text-[10px] text-slate-400">{it.planName} • Renewing: <span className="text-amber-400 font-bold">{it.renewDate}</span></span>
          </div>

          <div className="flex items-center gap-3 font-mono">
            <span className="font-extrabold text-emerald-400">${it.amount}</span>
            <Button variant="ghost" size="sm" onClick={() => onRemind?.(it.id)}>
              Send Invoice PDF
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
});

UpcomingRenewals.displayName = 'UpcomingRenewals';
