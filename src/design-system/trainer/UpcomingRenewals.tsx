import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';

export interface RenewalClient {
  id: string;
  name: string;
  packageType: string;
  daysRemaining: number;
}

export interface UpcomingRenewalsProps {
  clients?: RenewalClient[];
  className?: string;
}

export const UpcomingRenewals: React.FC<UpcomingRenewalsProps> = React.memo(({
  clients = [
    { id: '1', name: 'Alexander Hayes', packageType: '10x PT Sessions Package', daysRemaining: 3 },
    { id: '2', name: 'Samantha Reed', packageType: '3-Month Recomp Coaching', daysRemaining: 6 },
  ],
  className,
}) => {
  return (
    <Card variant="glass" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Clients PT Package Renewals</span>
        <Badge variant="warning" size="sm">{clients.length} Expiring Soon</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {clients.map((c) => (
          <div key={c.id} className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">{c.name}</span>
              <span className="text-[10px] text-slate-400">{c.packageType} • <span className="text-amber-400 font-bold">{c.daysRemaining} days left</span></span>
            </div>
            <Button variant="secondary" size="sm">Remind</Button>
          </div>
        ))}
      </div>
    </Card>
  );
});

UpcomingRenewals.displayName = 'UpcomingRenewals';
