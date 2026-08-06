import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Bot, Sparkles } from '../icons';

export interface AIInsightsProps {
  churnAlertsCount?: number;
  recommendation?: string;
  className?: string;
}

export const AIInsights: React.FC<AIInsightsProps> = React.memo(({
  churnAlertsCount = 14,
  recommendation = "Trinity AI Analysis: 14 members haven't checked in over 10 days. Send a automated 1-on-1 trainer check-in message to boost retention by estimated +22%.",
  className,
}) => {
  return (
    <Card variant="coach" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Trinity AI Customer Retention Advisor</span>
        </div>
        <Badge variant="ai" size="sm" icon={<Sparkles className="w-3 h-3" />}>
          Churn Prevention
        </Badge>
      </div>

      <div className="flex flex-col gap-2 bg-slate-950/60 p-4 rounded-2xl border border-white/5 text-xs text-slate-300">
        <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">Retention Campaign Alert ({churnAlertsCount} Members)</span>
        <p className="leading-relaxed">{recommendation}</p>
      </div>
    </Card>
  );
});

AIInsights.displayName = 'AIInsights';
