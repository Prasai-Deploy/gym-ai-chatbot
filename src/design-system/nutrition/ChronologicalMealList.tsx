import React, { useState } from 'react';
import { Check, Plus, ArrowRight } from '../icons';
import { cn } from '../tokens';

export interface MealItem {
  id: string;
  name: string;
  description: string;
  calories: number;
  proteinGrams: number;
  completed: boolean;
  timeSlot?: string;
}

export interface ChronologicalMealListProps {
  initialMeals?: MealItem[];
  onLogMeal?: (mealId: string) => void;
  className?: string;
}

export const ChronologicalMealList: React.FC<ChronologicalMealListProps> = React.memo(({
  initialMeals = [
    { id: 'm1', name: 'Breakfast', description: 'Greek yogurt + blueberries + rolled oats', calories: 520, proteinGrams: 36, completed: true, timeSlot: '8:30 AM' },
    { id: 'm2', name: 'Lunch', description: 'Grilled chicken breast + brown rice + avocado', calories: 680, proteinGrams: 52, completed: true, timeSlot: '1:00 PM' },
    { id: 'm3', name: 'Post Workout', description: 'Whey isolate protein shake + banana', calories: 280, proteinGrams: 30, completed: false, timeSlot: '4:30 PM' },
    { id: 'm4', name: 'Dinner', description: 'Wild salmon fillet + jasmine rice + asparagus', calories: 650, proteinGrams: 42, completed: false, timeSlot: '8:00 PM' },
  ],
  onLogMeal,
  className,
}) => {
  const [meals, setMeals] = useState<MealItem[]>(initialMeals);

  const toggleMealCompleted = (mealId: string) => {
    setMeals((prev) =>
      prev.map((m) => (m.id === mealId ? { ...m, completed: !m.completed } : m))
    );
    onLogMeal?.(mealId);
  };

  return (
    <div className={cn('w-full flex flex-col gap-3.5 select-none', className)}>
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.12em] font-sans">
          Today's Meals
        </h2>
        <span className="text-xs text-slate-400 font-medium">
          {meals.filter((m) => m.completed).length} / {meals.length} Logged
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {meals.map((meal) => (
          <div
            key={meal.id}
            onClick={() => toggleMealCompleted(meal.id)}
            className={cn(
              'p-4 rounded-xl border transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer group',
              meal.completed
                ? 'bg-[#11141D] border-white/[0.06] opacity-85'
                : 'bg-[#11141D] border-white/[0.09] hover:border-orange-500/30'
            )}
          >
            {/* Left: Meal Identity & Description */}
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              {/* Checkbox Icon */}
              <div
                className={cn(
                  'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                  meal.completed
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/[0.04] text-slate-500 border border-white/[0.08] group-hover:border-orange-500/40 group-hover:text-orange-400'
                )}
              >
                {meal.completed ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Plus className="w-3.5 h-3.5" />}
              </div>

              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-bold tracking-tight', meal.completed ? 'text-slate-200 line-through decoration-slate-600' : 'text-white')}>
                    {meal.name}
                  </span>
                  {meal.timeSlot && (
                    <span className="text-[10px] text-slate-500 font-medium">
                      {meal.timeSlot}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {meal.description}
                </p>
              </div>
            </div>

            {/* Right: Calories & Macro Pill */}
            <div className="flex items-center gap-3 shrink-0 text-right">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-white font-display tabular-nums">
                  {meal.calories} <span className="text-xs font-normal text-slate-400 font-sans">kcal</span>
                </span>
                <span className="text-[11px] font-semibold text-emerald-400 tabular-nums">
                  {meal.proteinGrams}g protein
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

ChronologicalMealList.displayName = 'ChronologicalMealList';
