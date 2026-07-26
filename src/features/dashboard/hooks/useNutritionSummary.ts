import { useCallback } from 'react';
import { dashboardService } from '../services/dashboard.service';

export function useNutritionSummary({
  setWaterSummary,
  setWeeklyChartData,
  fetchTodayWater,
  fetchDashboardData,
  fetchWeeklyProgress
}: {
  setWaterSummary: any;
  setWeeklyChartData: any;
  fetchTodayWater: () => void;
  fetchDashboardData: () => void;
  fetchWeeklyProgress: () => void;
}) {
  const handleAddWater = useCallback(async (amount: number) => {
    // Optimistic UI
    setWaterSummary((prev: any) => ({
      ...prev,
      total_consumed: (prev?.total_consumed || 0) + amount,
      completion_percentage: Math.min(100, Math.round(((prev?.total_consumed || 0) + amount) / (prev?.daily_goal || 2000) * 100))
    }));

    // Optimistic UI for chart
    const today = new Date().toISOString().split('T')[0];
    setWeeklyChartData((prev: any[]) => prev.map(d => 
      d.date.includes(today) ? { ...d, hydration_completion: Math.min(100, (d.hydration_completion || 0) + (amount / 2000 * 100)) } : d
    ));

    try {
      const ok = await dashboardService.addWater(amount);
      if (ok) {
        fetchTodayWater();
        fetchDashboardData();
        fetchWeeklyProgress();
      }
    } catch (e) {
      console.error(e);
    }
  }, [setWaterSummary, setWeeklyChartData, fetchTodayWater, fetchDashboardData, fetchWeeklyProgress]);

  const handleUpdateWaterGoal = useCallback(async (goal: number) => {
    try {
      const ok = await dashboardService.updateWaterGoal(goal);
      if (ok) {
        fetchTodayWater();
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  }, [fetchTodayWater, fetchDashboardData]);

  const handleRemoveWater = useCallback(async (id: number) => {
    try {
      const ok = await dashboardService.removeWater(id);
      if (ok) {
        fetchTodayWater();
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  }, [fetchTodayWater, fetchDashboardData]);

  return { handleAddWater, handleUpdateWaterGoal, handleRemoveWater };
}
