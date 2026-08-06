import React from 'react';
import { MealCard, MealItemData } from './MealCard';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';

export interface MealTimelineProps {
  meals?: MealItemData[];
  onToggleComplete?: (id: string) => void;
  className?: string;
}

export const MealTimeline: React.FC<MealTimelineProps> = React.memo(({
  meals = [
    { id: '1', name: 'Oatmeal & Whey Protein Bowl with Berries', category: 'Breakfast', time: '08:00 AM', calories: 480, proteinG: 40, carbsG: 60, fatsG: 10, completed: true },
    { id: '2', name: 'Grilled Chicken Breast, Quinoa & Broccoli', category: 'Lunch', time: '01:00 PM', calories: 650, proteinG: 55, carbsG: 70, fatsG: 12, completed: true },
    { id: '3', name: 'Anabolic Whey Isolate Shake & Rice Cakes', category: 'Post-Workout', time: '05:00 PM', calories: 380, proteinG: 45, carbsG: 40, fatsG: 4, completed: false },
    { id: '4', name: 'Wild Salmon, Sweet Potato & Asparagus', category: 'Dinner', time: '08:30 PM', calories: 640, proteinG: 50, carbsG: 50, fatsG: 22, completed: false },
  ],
  onToggleComplete,
  className,
}) => {
  return (
    <Card variant="default" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Today's Daily Meal Stream</span>
        <Badge variant="neutral" size="sm">{meals.filter((m) => m.completed).length} / {meals.length} Logged</Badge>
      </div>

      <div className="flex flex-col gap-3">
        {meals.map((meal) => (
          <MealCard key={meal.id} meal={meal} onToggleComplete={onToggleComplete} />
        ))}
      </div>
    </Card>
  );
});

MealTimeline.displayName = 'MealTimeline';
