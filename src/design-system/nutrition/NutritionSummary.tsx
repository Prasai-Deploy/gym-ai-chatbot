import React from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { StatCard } from '../components/StatCard';
import { Flame, PieChart, Activity, Award } from '../icons';

export interface NutritionSummaryProps {
  totalCalories?: number;
  proteinG?: number;
  carbsG?: number;
  fatsG?: number;
  adherenceScore?: number;
  className?: string;
}

export const NutritionSummary: React.FC<NutritionSummaryProps> = React.memo(({
  totalCalories = 2150,
  proteinG = 155,
  carbsG = 220,
  fatsG = 55,
  adherenceScore = 88,
  className,
}) => {
  return (
    <Card variant="nutrition" className={`p-6 flex flex-col gap-4 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">End-of-Day Nutrition Report</span>
        </div>
        <Badge variant="success" size="sm">{adherenceScore}% Adherence</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard title="Total Energy" value={totalCalories} unit="kcal" icon={<Flame className="w-5 h-5 text-orange-400" />} variant="default" />
        <StatCard title="Protein Intake" value={`${proteinG}g`} unit="target: 180g" icon={<PieChart className="w-5 h-5 text-orange-400" />} variant="primary" />
        <StatCard title="Carbohydrates" value={`${carbsG}g`} unit="target: 250g" icon={<PieChart className="w-5 h-5 text-indigo-400" />} variant="default" />
        <StatCard title="Healthy Fats" value={`${fatsG}g`} unit="target: 65g" icon={<Activity className="w-5 h-5 text-emerald-400" />} variant="default" />
      </div>
    </Card>
  );
});

NutritionSummary.displayName = 'NutritionSummary';
