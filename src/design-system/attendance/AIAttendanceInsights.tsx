import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Bot, Sparkles } from '../icons';

export interface AIAttendanceInsightsProps {
  congestionWarning?: string;
  recommendation?: string;
  className?: string;
}

export const AIAttendanceInsights: React.FC<AIAttendanceInsightsProps> = React.memo(({
  congestionWarning = "Trinity AI Analysis: Turnstile A queue projected to reach 12 scans/min at 06:15 PM.",
  recommendation = "Open Turnstile B for express QR check-ins during 06:00 PM - 07:30 PM to prevent front desk bottlenecking.",
  className,
}) => {
  return (
    <Card variant="coach" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Trinity AI Front Desk Flow Advisor</span>
        </div>
        <Badge variant="ai" size="sm" icon={<Sparkles className="w-3 h-3" />}>
          Turnstile Throughput
        </Badge>
      </div>

      <div className="flex flex-col gap-3 bg-slate-950/60 p-4 rounded-2xl border border-white/5 text-xs text-slate-300">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">Peak Flow Warning</span>
          <p className="leading-relaxed">{congestionWarning}</p>
        </div>

        <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
          <span className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Turnstile Throughput Action</span>
          <p className="leading-relaxed">{recommendation}</p>
        </div>
      </div>
    </Card>
  );
});

AIAttendanceInsights.displayName = 'AIAttendanceInsights';
