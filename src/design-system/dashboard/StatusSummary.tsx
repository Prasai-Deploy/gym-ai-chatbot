import React from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Droplets, PieChart, Plus } from '../icons';
import { cn } from '../tokens';

export interface StatusSummaryProps {
  nutritionData?: any;
  onLogWater: (amountMl: number) => void;
  isLoggingWater?: boolean;
  onOpenNutrition: () => void;
  className?: string;
}

export const StatusSummary: React.FC<StatusSummaryProps> = React.memo(({
  nutritionData,
  onLogWater,
  isLoggingWater = false,
  onOpenNutrition,
  className,
}) => {
  const totalWaterMl = nutritionData?.totalWaterMl || 0;
  const totalCalories = nutritionData?.totalCalories || 0;
  const totalProtein = nutritionData?.totalProtein || 0;
  const mealCount = Array.isArray(nutritionData?.meals) ? nutritionData.meals.length : 0;

  return (
    <div className={cn('w-full flex flex-col gap-3', className)}>
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans px-1">
        TODAY'S TRACKING
      </span>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Hydration Status */}
        <Card variant="default" className="p-5 rounded-2xl bg-[#11141D] border border-white/[0.08] flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Droplets className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">
                  WATER
                </span>
                <span className="text-xl font-bold text-white font-sans">
                  {totalWaterMl > 0 ? `${totalWaterMl} mL` : '0 mL logged'}
                </span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="md"
              onClick={() => onLogWater(250)}
              disabled={isLoggingWater}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 text-xs font-bold gap-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/25"
            >
              <Plus className="w-4 h-4" />
              <span>+250 mL</span>
            </Button>
          </div>

          <p className="text-xs text-slate-400 font-sans">
            {totalWaterMl > 0
              ? `${totalWaterMl} mL recorded today.`
              : `Tap the button above to log your water intake.`}
          </p>
        </Card>

        {/* Nutrition Status */}
        <Card
          variant="default"
          onClick={onOpenNutrition}
          className="p-5 rounded-2xl bg-[#11141D] border border-white/[0.08] hover:border-white/20 transition-colors cursor-pointer flex flex-col justify-between gap-4 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <PieChart className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">
                  FOOD
                </span>
                <span className="text-xl font-bold text-white font-sans">
                  {mealCount > 0 ? `${totalCalories} kcal` : 'No meals yet'}
                </span>
              </div>
            </div>

            {mealCount > 0 ? (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                {totalProtein}g protein
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-400 group-hover:text-white transition-colors">
                Log Meal →
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 font-sans">
            {mealCount > 0
              ? `${mealCount} meal${mealCount > 1 ? 's' : ''} logged today.`
              : `Track meals to balance your protein and calories.`}
          </p>
        </Card>
      </div>
    </div>
  );
});

StatusSummary.displayName = 'StatusSummary';
