import React from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Bot, Sparkles, ArrowRight } from '../icons';

export interface CoachNutritionCardProps {
  onAskDietAdvice?: (prompt: string) => void;
  className?: string;
}

export const CoachNutritionCard: React.FC<CoachNutritionCardProps> = React.memo(({
  onAskDietAdvice,
  className,
}) => {
  return (
    <Card variant="coach" className={`p-6 flex flex-col justify-between gap-4 select-none ${className}`}>
      <div className="flex items-center gap-2">
        <Bot className="w-5 h-5 text-indigo-400" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">Trinity AI Diet Advisor</span>
      </div>

      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-3.5 rounded-2xl border border-white/5">
        "Need a custom low-carb dinner recipe or a precise post-workout shake ratio? Ask me to generate it instantly."
      </p>

      <Button
        variant="premium"
        size="md"
        rightIcon={<ArrowRight className="w-4 h-4" />}
        onClick={() => onAskDietAdvice?.("Generate a high-protein dinner recipe matching my remaining macros.")}
        className="w-full"
      >
        Ask AI for Custom Recipe
      </Button>
    </Card>
  );
});

CoachNutritionCard.displayName = 'CoachNutritionCard';
