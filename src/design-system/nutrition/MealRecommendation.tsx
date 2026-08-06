import React from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Sparkles, Plus } from '../icons';

export interface MealRecommendationProps {
  recipeTitle?: string;
  category?: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatsG?: number;
  prepTimeMin?: number;
  ingredients?: string[];
  onLogRecommendedMeal?: () => void;
  className?: string;
}

export const MealRecommendation: React.FC<MealRecommendationProps> = React.memo(({
  recipeTitle = 'Anabolic Post-Workout Salmon & Sweet Potato Bowl',
  category = 'Post-Workout Anabolic Re-Fuel',
  calories = 620,
  proteinG = 52,
  carbsG = 65,
  fatsG = 16,
  prepTimeMin = 15,
  ingredients = ['200g Wild Salmon Fillet', '200g Baked Sweet Potato', 'Steamed Asparagus', '1 tsp Olive Oil'],
  onLogRecommendedMeal,
  className,
}) => {
  return (
    <Card variant="nutrition" className={`p-6 flex flex-col justify-between gap-5 relative overflow-hidden select-none ${className}`}>
      <div className="flex items-center justify-between">
        <Badge variant="ai" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
          TRINITY AI RECOMMENDED NEXT MEAL
        </Badge>
        <span className="text-xs font-mono font-bold text-emerald-400">Prep: {prepTimeMin} min</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{category}</span>
        <h3 className="text-xl font-extrabold text-white tracking-tight">{recipeTitle}</h3>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center bg-slate-950/60 p-3 rounded-2xl border border-white/5 text-xs">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-semibold">Calories</span>
          <span className="font-extrabold text-white">{calories}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-semibold">Protein</span>
          <span className="font-extrabold text-orange-400">{proteinG}g</span>
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
          <span key={idx} className="px-2.5 py-1 rounded-xl bg-white/5 text-slate-300 text-xs font-medium border border-white/5">
            • {ing}
          </span>
        ))}
      </div>

      <Button
        variant="primary"
        size="lg"
        leftIcon={<Plus className="w-4 h-4 text-white" />}
        onClick={onLogRecommendedMeal}
        className="w-full"
      >
        Log This Meal to Tracker
      </Button>
    </Card>
  );
});

MealRecommendation.displayName = 'MealRecommendation';
