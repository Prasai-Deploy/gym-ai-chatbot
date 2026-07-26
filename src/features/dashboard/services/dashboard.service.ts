import { httpClient } from '../../../api/httpClient';
import {
  ChartData,
  WeeklySummary,
  DashboardData,
  ActivityItem,
  WaterSummary,
  WaterLog,
} from '../types/dashboard.types';

/**
 * Dashboard service — all calls go through httpClient (Axios).
 * JWT is auto-injected by the httpClient request interceptor.
 * All endpoints hit /api/v1/* on the v2 backend.
 */
export const dashboardService = {
  async fetchWeeklyProgress(): Promise<{ chartData: ChartData[]; summary: WeeklySummary }> {
    let chartData: ChartData[] = [];
    let summary: WeeklySummary = {
      total_calories: 0,
      total_workouts: 0,
      avg_hydration: 0,
      avg_diet: 0,
    };

    try {
      // v2 endpoint: /api/v1/progress/statistics
      const data = await httpClient.get('/progress/statistics') as any;
      if (data?.data) {
        summary = {
          total_calories: data.data.lifetime_volume_kg ?? 0,
          total_workouts: data.data.workout_count ?? 0,
          avg_hydration: 0,
          avg_diet: 0,
        };
      }
    } catch {
      // Return empty on error — dashboard degrades gracefully
    }

    return { chartData, summary };
  },

  async fetchDashboardData(): Promise<DashboardData | null> {
    try {
      const data = await httpClient.get('/progress/statistics') as any;
      if (!data) return null;
      // Shape the v2 statistics response into DashboardData format
      return {
        today_stats: {
          water_ml: 0, // Not tracked separately in v2 yet
          calories_burned: data.data?.lifetime_volume_kg ?? 0,
          workouts_completed: data.data?.workout_count ?? 0,
        },
        recent_workouts: [],
      } as any;
    } catch {
      return null;
    }
  },

  async fetchActivities(limit: number = 10): Promise<ActivityItem[]> {
    try {
      // v2 does not have an /activity/recent endpoint yet.
      // Return empty array — ActivitySection will show empty state.
      return [];
    } catch {
      return [];
    }
  },

  async fetchTodayWater(): Promise<{ summary: WaterSummary; logs: WaterLog[] } | null> {
    try {
      // Water tracking now lives in intelligence/context in v2.
      const data = await httpClient.get('/intelligence/context') as any;
      const nutritionCtx = data?.data?.nutrition;
      if (!nutritionCtx) return null;
      return {
        summary: {
          total_consumed: nutritionCtx.water_ml ?? 0,
          daily_goal: nutritionCtx.water_goal ?? 2000,
          completion_percentage: Math.min(
            100,
            Math.round(((nutritionCtx.water_ml ?? 0) / (nutritionCtx.water_goal ?? 2000)) * 100)
          ),
        },
        logs: [],
      };
    } catch {
      return null;
    }
  },

  async addWater(amount: number, source: string = 'manual'): Promise<boolean> {
    try {
      await httpClient.post('/intelligence/nutrition/log', { water_ml: amount, source });
      return true;
    } catch {
      return false;
    }
  },

  async updateWaterGoal(goal: number, _isAI: boolean = false): Promise<boolean> {
    try {
      await httpClient.post('/intelligence/nutrition/log', { water_goal: goal });
      return true;
    } catch {
      return false;
    }
  },

  async removeWater(_id: number): Promise<boolean> {
    // Not implemented in v2 — return false gracefully
    return false;
  },

  async fetchLatestPlan(): Promise<any | null> {
    try {
      const data = await httpClient.get('/workouts/programs?latest=true') as any;
      return data?.data ?? null;
    } catch {
      return null;
    }
  },

  async fetchPlanHistory(): Promise<any[]> {
    try {
      const data = await httpClient.get('/workouts/programs') as any;
      return Array.isArray(data?.data) ? data.data : [];
    } catch {
      return [];
    }
  },

  async savePlan(_planForm: { workout_plan: string; diet_plan: string; date: string }): Promise<boolean> {
    // No v2 endpoint for saving custom plans yet
    return false;
  },

  async togglePlanComplete(_id: number, _currentStatus: boolean): Promise<boolean> {
    // No v2 endpoint for toggling plan completion yet
    return false;
  },
};
