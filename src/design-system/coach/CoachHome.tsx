import React from 'react';
import { CoachGreeting } from './CoachGreeting';
import { CoachStatus } from './CoachStatus';
import { SuggestionChips } from './SuggestionChips';
import { Card } from '../components/Card';
import { Flame, PieChart, Activity, Sparkles } from '../icons';

export interface CoachHomeProps {
  userName?: string;
  onSelectSuggestion: (text: string) => void;
  className?: string;
}

export const CoachHome: React.FC<CoachHomeProps> = React.memo(({
  userName = 'Alex',
  onSelectSuggestion,
  className,
}) => {
  return (
    <div className={`w-full flex flex-col gap-6 p-4 sm:p-6 max-w-4xl mx-auto ${className}`}>
      <CoachGreeting userName={userName} readinessScore={88} activeGoal="Hypertrophy & Strength" />
      <CoachStatus modelName="Arcee Trinity 400B MoE" contextWindow="128k Tokens" readinessScore={88} />

      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Suggested Coach Prompts</span>
        <SuggestionChips onSelectSuggestion={onSelectSuggestion} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <Card
          variant="workout"
          interactive
          onClick={() => onSelectSuggestion("Build a 4-day hypertrophy split tailored to my recovery score.")}
          className="p-4 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="text-xs font-bold text-white">Workout Tuning</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Optimize your sets, reps, and RPE based on CNS readiness.
          </p>
        </Card>

        <Card
          variant="nutrition"
          interactive
          onClick={() => onSelectSuggestion("Calculate my exact post-workout protein and carb targets.")}
          className="p-4 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold text-white">Macro Optimization</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Get precision nutrient timing and custom meal recipes.
          </p>
        </Card>

        <Card
          variant="coach"
          interactive
          onClick={() => onSelectSuggestion("Analyze my HRV and sleep trends to prevent overtraining.")}
          className="p-4 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-bold text-white">Recovery Audit</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Prevent injury and fatigue with WHOOP/Oura data insights.
          </p>
        </Card>
      </div>
    </div>
  );
});

CoachHome.displayName = 'CoachHome';
