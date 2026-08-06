import React from 'react';
import { Button } from '../components/Button';
import { Flame, Bot, Plus, TrendingUp } from '../icons';

export interface QuickActionsProps {
  onLogWorkout?: () => void;
  onAskCoach?: () => void;
  onLogNutrition?: () => void;
  onRecordWeight?: () => void;
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = React.memo(({
  onLogWorkout,
  onAskCoach,
  onLogNutrition,
  onRecordWeight,
  className,
}) => {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${className}`}>
      <Button
        variant="primary"
        size="md"
        leftIcon={<Flame className="w-4 h-4" />}
        onClick={onLogWorkout}
      >
        Log Workout
      </Button>

      <Button
        variant="premium"
        size="md"
        leftIcon={<Bot className="w-4 h-4" />}
        onClick={onAskCoach}
      >
        Ask AI Coach
      </Button>

      <Button
        variant="secondary"
        size="md"
        leftIcon={<Plus className="w-4 h-4 text-emerald-400" />}
        onClick={onLogNutrition}
      >
        Log Meal
      </Button>

      <Button
        variant="outline"
        size="md"
        leftIcon={<TrendingUp className="w-4 h-4 text-cyan-400" />}
        onClick={onRecordWeight}
      >
        Log Weight
      </Button>
    </div>
  );
});

QuickActions.displayName = 'QuickActions';
