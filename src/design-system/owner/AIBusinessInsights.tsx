import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Bot, Sparkles } from '../icons';

export interface AIBusinessInsightsProps {
  pricingAdvice?: string;
  staffingAdvice?: string;
  className?: string;
}

export const AIBusinessInsights: React.FC<AIBusinessInsightsProps> = React.memo(({
  pricingAdvice = "Trinity AI Suggestion: Floor occupancy reaches 94% between 6:00 PM - 8:00 PM. Introduce Off-Peak Tier pricing ($79/mo) to smooth peak bottlenecks.",
  staffingAdvice = "Personal Training Conversion Opportunity: 18 new members signed up this week. Schedule intro PT calls to boost MRR by estimated +$2,250/mo.",
  className,
}) => {
  return (
    <Card variant="coach" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Trinity AI SaaS Business Advisor</span>
        </div>
        <Badge variant="ai" size="sm" icon={<Sparkles className="w-3 h-3" />}>
          MRR Optimization
        </Badge>
      </div>

      <div className="flex flex-col gap-3 bg-slate-950/60 p-4 rounded-2xl border border-white/5 text-xs text-slate-300">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">Dynamic Capacity Pricing</span>
          <p className="leading-relaxed">{pricingAdvice}</p>
        </div>

        <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
          <span className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Staff & PT Yield Optimization</span>
          <p className="leading-relaxed">{staffingAdvice}</p>
        </div>
      </div>
    </Card>
  );
});

AIBusinessInsights.displayName = 'AIBusinessInsights';
