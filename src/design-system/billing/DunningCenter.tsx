import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { FailedPayments } from './FailedPayments';

export interface DunningCenterProps {
  recoveredAmountMo?: number;
  delinquentCount?: number;
  className?: string;
}

export const DunningCenter: React.FC<DunningCenterProps> = React.memo(({
  recoveredAmountMo = 2140,
  delinquentCount = 3,
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 border-amber-500/30 bg-amber-950/10 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white uppercase tracking-wider">Automated Dunning & Failed Card Recovery Engine</span>
        <Badge variant="success" size="sm">+${recoveredAmountMo.toLocaleString()} Recovered This Month</Badge>
      </div>

      <p className="text-xs text-amber-200">
        Trinity Dunning automatically retries declined credit cards at optimal bank authorization hours and dispatches SMS card update links to prevent involuntary churn.
      </p>

      <FailedPayments />
    </Card>
  );
});

DunningCenter.displayName = 'DunningCenter';
