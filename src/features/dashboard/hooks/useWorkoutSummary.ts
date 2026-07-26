import { useMemo } from 'react';
import { format } from 'date-fns';
import { ProgressData, DashboardData } from '../types/dashboard.types';

export function useWorkoutSummary(
  progress: ProgressData[], 
  dashboardData: DashboardData | null
) {
  return useMemo(() => {
    const today1 = format(new Date(), 'MMM dd');
    const today2 = new Date().toISOString().split('T')[0];
    const todaysProgress = progress.filter(p => p.date === today1 || p.date === today2);
    
    const totalProteinRaw = todaysProgress.reduce((sum, p) => sum + (p.protein || 0), 0);
    const totalCarbsRaw = todaysProgress.reduce((sum, p) => sum + (p.carbs || 0), 0);
    const totalFatsRaw = todaysProgress.reduce((sum, p) => sum + (p.fats || 0), 0);
    const totalWaterRaw = todaysProgress.reduce((sum, p) => sum + (p.water || 0), 0);
    const totalCaloriesRaw = todaysProgress.reduce((sum, p) => sum + (p.calories || 0), 0);
    
    const stats = dashboardData?.today_stats || {
      protein: totalProteinRaw,
      carbs: totalCarbsRaw,
      fats: totalFatsRaw,
      calories_consumed: totalCaloriesRaw,
      calories_burned: 0,
      water_ml: totalWaterRaw
    };

    return {
      totalProtein: stats.protein || totalProteinRaw,
      totalCarbs: stats.carbs || totalCarbsRaw,
      totalFats: stats.fats || totalFatsRaw,
      totalCalories: stats.calories_consumed || totalCaloriesRaw,
      totalBurned: stats.calories_burned || 0,
      totalWater: stats.water_ml || totalWaterRaw
    };
  }, [progress, dashboardData]);
}
