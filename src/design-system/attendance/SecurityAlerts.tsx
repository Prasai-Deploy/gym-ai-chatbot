import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { AlertTriangle, ChevronRight } from '../icons';

export interface AlertSecurity {
  id: string;
  title: string;
  detail: string;
  time: string;
  severity: 'High' | 'Medium';
}

export interface SecurityAlertsProps {
  alerts?: AlertSecurity[];
  onInspectAlert?: (id: string) => void;
  className?: string;
}

export const SecurityAlerts: React.FC<SecurityAlertsProps> = React.memo(({
  alerts = [
    { id: '1', title: 'Expired Pass Scan Attempt', detail: 'Lucas Torrez scanned an expired membership pass at Turnstile A', time: '14 mins ago', severity: 'High' },
    { id: '2', title: 'Tailgating Detection', detail: 'Turnstile B sensor detected double entry scan', time: '45 mins ago', severity: 'Medium' },
  ],
  onInspectAlert,
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Front Desk Security Alerts</span>
        </div>
        <Badge variant="danger" size="sm">{alerts.length} Active Alerts</Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        {alerts.map((al) => (
          <div key={al.id} className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{al.title}</span>
                <span className="text-[10px] text-slate-400">{al.time}</span>
              </div>
              <p className="text-[11px] text-red-200">{al.detail}</p>
            </div>

            <ChevronRight className="w-4 h-4 text-red-400 cursor-pointer" onClick={() => onInspectAlert?.(al.id)} />
          </div>
        ))}
      </div>
    </Card>
  );
});

SecurityAlerts.displayName = 'SecurityAlerts';
