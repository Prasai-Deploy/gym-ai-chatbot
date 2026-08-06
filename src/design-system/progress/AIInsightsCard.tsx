import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Sparkles, Bot } from '../icons';

export interface AIInsightsCardProps {
  predictionText?: string;
  recommendationText?: string;
  className?: string;
}

export const AIInsightsCard: React.FC<AIInsightsCardProps> = React.memo(({
  predictionText = "At your current +2.5kg/week rate, you are on track to surpass 110kg Bench Press by September 15.",
  recommendationText = "Plateau Prevention: Increase your tricep accessory volume by +2 working sets to support your lockout phase.",
  className,
}) => {
  return (
    <Card variant="coach" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Trinity AI Strength Analytics</span>
        </div>
        <Badge variant="ai" size="sm" icon={<Sparkles className="w-3 h-3" />}>
          Plateau Intelligence
        </Badge>
      </div>

      <div className="flex flex-col gap-2 bg-slate-950/60 p-4 rounded-2xl border border-white/5 text-xs text-slate-300">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-orange-400 uppercase tracking-wider text-[10px]">1RM Projection</span>
          <p className="leading-relaxed">{predictionText}</p>
        </div>

        <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
          <span className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">AI Optimization Directive</span>
          <p className="leading-relaxed">{recommendationText}</p>
        </div>
      </div>
    </Card>
  );
});

AIInsightsCard.displayName = 'AIInsightsCard';
