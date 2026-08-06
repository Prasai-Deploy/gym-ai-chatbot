import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Bot, Sparkles } from '../icons';

export interface AIRevenueInsightsProps {
  expansionOpp?: string;
  recommendation?: string;
  className?: string;
}

export const AIRevenueInsights: React.FC<AIRevenueInsightsProps> = React.memo(({
  expansionOpp = "Trinity AI Revenue Insight: 64 Gold Pro members have completed 12+ workouts this month with high adherence.",
  recommendation = "Offer a targeted 15% discount on VIP Unlimited + 1-on-1 PT upgrade to unlock estimated +$4,200/mo net expansion MRR.",
  className,
}) => {
  return (
    <Card variant="coach" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Trinity AI Financial Expansion Advisor</span>
        </div>
        <Badge variant="ai" size="sm" icon={<Sparkles className="w-3 h-3" />}>
          MRR Expansion
        </Badge>
      </div>

      <div className="flex flex-col gap-3 bg-slate-950/60 p-4 rounded-2xl border border-white/5 text-xs text-slate-300">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">Expansion Opportunity</span>
          <p className="leading-relaxed">{expansionOpp}</p>
        </div>

        <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
          <span className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Actionable Revenue Campaign</span>
          <p className="leading-relaxed">{recommendation}</p>
        </div>
      </div>
    </Card>
  );
});

AIRevenueInsights.displayName = 'AIRevenueInsights';
