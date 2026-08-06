import React from 'react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { RefreshCw } from '../icons';

export interface FailedPaymentItem {
  id: string;
  memberName: string;
  amount: number;
  reason: string;
  retryAttempts: number;
}

export interface FailedPaymentsProps {
  items?: FailedPaymentItem[];
  onRetry?: (id: string) => void;
  className?: string;
}

export const FailedPayments: React.FC<FailedPaymentsProps> = React.memo(({
  items = [
    { id: 'f1', memberName: 'Lucas Torrez', amount: 249, reason: 'Insufficient Funds (Visa ••4920)', retryAttempts: 2 },
    { id: 'f2', memberName: 'Elena Gilbert', amount: 125, reason: 'Expired Card (Mastercard ••8811)', retryAttempts: 1 },
  ],
  onRetry,
  className,
}) => {
  return (
    <div className={`flex flex-col gap-2.5 select-none ${className}`}>
      {items.map((it) => (
        <div key={it.id} className="p-3.5 rounded-2xl bg-slate-900 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{it.memberName}</span>
              <Badge variant="danger" size="sm">Failed (${it.amount})</Badge>
            </div>
            <span className="text-[10px] text-amber-200">{it.reason} • Attempt #{it.retryAttempts}</span>
          </div>

          <Button
            variant="warning"
            size="sm"
            leftIcon={<RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />}
            onClick={() => onRetry?.(it.id)}
          >
            Retry Card Now
          </Button>
        </div>
      ))}
    </div>
  );
});

FailedPayments.displayName = 'FailedPayments';
