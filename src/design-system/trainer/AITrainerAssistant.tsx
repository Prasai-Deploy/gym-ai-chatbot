import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Bot, Sparkles, Check, X } from '../icons';
import { Button } from '../components/Button';

export interface AITrainerAssistantProps {
  onApplyRecommendation?: () => void;
  className?: string;
}

export const AITrainerAssistant: React.FC<AITrainerAssistantProps> = React.memo(({
  onApplyRecommendation,
  className,
}) => {
  return (
    <Card variant="coach" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Trinity AI Coaching Copilot</span>
        </div>
        <Badge variant="ai" size="sm" icon={<Sparkles className="w-3 h-3" />}>
          Smart Prescription
        </Badge>
      </div>

      <div className="flex flex-col gap-3 bg-slate-950/60 p-4 rounded-2xl border border-white/5 text-xs text-slate-300">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Client Progression Alert — Marcus Vance</span>
          <p className="leading-relaxed">
            Marcus has completed 4 consecutive sets of Bench Press at RPE 7. Recommend advancing working weight from 82.5kg to 85kg for next week's push split.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Check className="w-3.5 h-3.5 stroke-[3]" />}
            onClick={onApplyRecommendation}
            className="flex-1"
          >
            Approve Weight Bump
          </Button>
          <Button variant="ghost" size="sm" leftIcon={<X className="w-3.5 h-3.5" />}>
            Dismiss
          </Button>
        </div>
      </div>
    </Card>
  );
});

AITrainerAssistant.displayName = 'AITrainerAssistant';
