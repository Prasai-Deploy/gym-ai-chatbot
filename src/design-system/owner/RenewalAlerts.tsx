import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { AlertTriangle, RefreshCw, ChevronRight } from '../icons';

export interface AlertMember {
  id: string;
  name: string;
  plan: string;
  daysRemaining: number;
  churnRisk: 'High' | 'Medium' | 'Low';
}

export interface RenewalAlertsProps {
  alerts?: AlertMember[];
  onAutoRenew?: (id: string) => void;
  className?: string;
}

export const RenewalAlerts: React.FC<RenewalAlertsProps> = React.memo(({
  alerts = [
    { id: '1', name: 'Marcus Vance', plan: 'VIP Unlimited', daysRemaining: 2, churnRisk: 'High' },
    { id: '2', name: 'Sarah Jenkins', plan: 'Gold Pro', daysRemaining: 3, churnRisk: 'Medium' },
    { id: '3', name: 'David Miller', plan: 'Standard Pass', daysRemaining: 5, churnRisk: 'Low' },
  ],
  onAutoRenew,
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Expiring Memberships & Churn Alerts</span>
        </div>
        <Badge variant="warning" size="sm">{alerts.length} Action Needed</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {alerts.map((al) => (
          <div key={al.id} className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{al.name}</span>
                <Badge variant={al.churnRisk === 'High' ? 'danger' : 'warning'} size="sm">
                  {al.churnRisk} Churn Risk
                </Badge>
              </div>
              <span className="text-[10px] text-slate-400">
                {al.plan} • Expiring in <span className="text-amber-400 font-bold">{al.daysRemaining} days</span>
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className="w-3.5 h-3.5 text-emerald-400" />}
              onClick={() => onAutoRenew?.(al.id)}
            >
              Send Offer
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
});

RenewalAlerts.displayName = 'RenewalAlerts';
