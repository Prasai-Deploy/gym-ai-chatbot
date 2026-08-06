import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { UpcomingRenewals } from './UpcomingRenewals';

export interface RenewalCenterProps {
  renewalsCountThisWeek?: number;
  className?: string;
}

export const RenewalCenter: React.FC<RenewalCenterProps> = React.memo(({
  renewalsCountThisWeek = 28,
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Subscription Renewal & Auto-Bill Control Center</span>
        <Badge variant="success" size="sm">{renewalsCountThisWeek} Auto-Renewals This Week</Badge>
      </div>

      <UpcomingRenewals />
    </Card>
  );
});

RenewalCenter.displayName = 'RenewalCenter';
