import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Sparkles, CheckCircle2 } from '../icons';

export interface InsightItem {
  id: string;
  topic: string;
  detail: string;
}

export interface NutritionInsightsProps {
  insights?: InsightItem[];
  className?: string;
}

export const NutritionInsights: React.FC<NutritionInsightsProps> = React.memo(({
  insights = [
    { id: '1', topic: 'Anabolic Window Timing', detail: 'Consuming 45g protein within 45 mins post-workout elevates MPS by +32%.' },
    { id: '2', topic: 'Micronutrient Balance', detail: 'Zinc & Magnesium targets met. Sleep quality score projected at 94% tonight.' },
    { id: '3', topic: 'Electrolyte Balance', detail: 'Sodium-to-Potassium ratio optimal for preventing muscle cramping during leg split.' },
  ],
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Trinity AI Micronutrient Insights</span>
        </div>
        <Badge variant="ai" size="sm">Real-Time</Badge>
      </div>

      <div className="flex flex-col gap-3">
        {insights.map((item) => (
          <div key={item.id} className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-white">{item.topic}</span>
              <p className="text-xs text-slate-300 leading-relaxed">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

NutritionInsights.displayName = 'NutritionInsights';
