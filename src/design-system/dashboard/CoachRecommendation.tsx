import React from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Bot, Sparkles, ArrowRight } from '../icons';

export interface CoachRecommendationProps {
  advice?: string;
  modelName?: string;
  onOpenCoach?: () => void;
  className?: string;
}

export const CoachRecommendation: React.FC<CoachRecommendationProps> = React.memo(({
  advice = "Based on your 88% CNS readiness, increase your incline bench press working weight by +2.5kg today. Keep rest intervals at 90 seconds.",
  modelName = "Arcee Trinity 400B",
  onOpenCoach,
  className,
}) => {
  return (
    <Card variant="coach" className={`p-6 flex flex-col justify-between gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Trinity AI Advice</span>
        </div>
        <Badge variant="ai" size="sm" icon={<Sparkles className="w-3 h-3" />}>
          {modelName}
        </Badge>
      </div>

      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic bg-slate-950/40 p-3.5 rounded-2xl border border-white/5">
        "{advice}"
      </p>

      <Button
        variant="premium"
        size="md"
        rightIcon={<ArrowRight className="w-4 h-4" />}
        onClick={onOpenCoach}
        className="w-full"
      >
        Ask AI Coach Anything
      </Button>
    </Card>
  );
});

CoachRecommendation.displayName = 'CoachRecommendation';
