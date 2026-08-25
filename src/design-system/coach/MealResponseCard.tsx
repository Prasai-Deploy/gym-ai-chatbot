import React from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Plus } from '../icons';

export interface MealResponseCardProps {
  mealTitle: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  ingredients: string[];
  onLogMeal?: () => void;
  className?: string;
}

export const MealResponseCard: React.FC<MealResponseCardProps> = React.memo(({
  mealTitle,
  calories,
  proteinG,
  carbsG,
  fatsG,
  ingredients,
  onLogMeal,
  className,
}) => {
  return (
    <Card variant="nutrition" className={`p-5 flex flex-col gap-4 select-none my-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Badge variant="success" size="sm">
          AI RECOMMENDED MEAL
        </Badge>
        <span className="text-xs font-mono font-bold text-emerald-400">{calories} kcal</span>
      </div>

      <h3 className="text-base font-extrabold text-white">{mealTitle}</h3>

      <div className="grid grid-cols-3 gap-2 text-center bg-slate-950/60 p-3 rounded-2xl border border-white/5 text-xs">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-semibold">Protein</span>
          <span className="font-extrabold text-brand-400">{proteinG}g</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-semibold">Carbs</span>
          <span className="font-extrabold text-indigo-400">{carbsG}g</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-semibold">Fats</span>
          <span className="font-extrabold text-emerald-400">{fatsG}g</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ingredients.map((ing, idx) => (
          <span key={idx} className="px-2 py-0.5 rounded-lg bg-white/5 text-slate-300 text-[11px] font-medium border border-white/5">
            • {ing}
          </span>
        ))}
      </div>

      <Button
        variant="secondary"
        size="md"
        leftIcon={<Plus className="w-4 h-4 text-emerald-400" />}
        onClick={onLogMeal}
        className="w-full"
      >
        Add to Daily Diet Tracker
      </Button>
    </Card>
  );
});

MealResponseCard.displayName = 'MealResponseCard';
