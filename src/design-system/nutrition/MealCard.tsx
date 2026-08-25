import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { CheckCircle2, Clock } from '../icons';

export interface MealItemData {
  id: string;
  name: string;
  category: 'Breakfast' | 'Lunch' | 'Post-Workout' | 'Dinner' | 'Snack';
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  time: string;
  completed?: boolean;
}

export interface MealCardProps {
  meal: MealItemData;
  onToggleComplete?: (id: string) => void;
  className?: string;
}

export const MealCard: React.FC<MealCardProps> = React.memo(({
  meal,
  onToggleComplete,
  className,
}) => {
  return (
    <Card
      variant="default"
      className={`p-4 flex flex-col gap-3 transition-all select-none ${
        meal.completed ? 'opacity-75 bg-slate-900/50' : 'hover:border-white/20'
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={meal.completed ? 'success' : 'primary'} size="sm">
            {meal.category}
          </Badge>
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {meal.time}
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-emerald-400">{meal.calories} kcal</span>
      </div>

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white tracking-tight">{meal.name}</h4>
        {onToggleComplete && (
          <button
            type="button"
            onClick={() => onToggleComplete(meal.id)}
            className={`p-1.5 rounded-xl border transition-all ${
              meal.completed
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-slate-800 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs font-semibold text-slate-300 pt-1 border-t border-white/5">
        <span className="text-brand-400">{meal.proteinG}g Protein</span>
        <span className="text-indigo-400">{meal.carbsG}g Carbs</span>
        <span className="text-emerald-400">{meal.fatsG}g Fats</span>
      </div>
    </Card>
  );
});

MealCard.displayName = 'MealCard';
