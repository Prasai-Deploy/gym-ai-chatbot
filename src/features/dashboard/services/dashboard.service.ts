import { 
  ChartData, 
  WeeklySummary, 
  DashboardData, 
  ActivityItem, 
  WaterSummary, 
  WaterLog, 
  DailyPlan 
} from '../types/dashboard.types';

export const dashboardService = {
  async fetchWeeklyProgress(): Promise<{ chartData: ChartData[], summary: WeeklySummary }> {
    const [chartRes, summaryRes] = await Promise.all([
      fetch('/api/progress/chart-data'),
      fetch('/api/progress/summary')
    ]);
    
    let chartData: ChartData[] = [];
    let summary: WeeklySummary = {
      total_calories: 0,
      total_workouts: 0,
      avg_hydration: 0,
      avg_diet: 0
    };

    if (chartRes.ok) {
      const data = await chartRes.json();
      chartData = Array.isArray(data) ? data : [];
    }
    if (summaryRes.ok) {
      const data = await summaryRes.json();
      summary = data || summary;
    }

    return { chartData, summary };
  },

  async fetchDashboardData(): Promise<DashboardData | null> {
    const res = await fetch('/api/dashboard/progress');
    if (!res.ok) return null;
    return await res.json();
  },

  async fetchActivities(limit: number = 10): Promise<ActivityItem[]> {
    const res = await fetch(`/api/activity/recent?limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
    return [];
  },

  async fetchTodayWater(): Promise<{ summary: WaterSummary, logs: WaterLog[] } | null> {
    const res = await fetch('/api/water/today');
    if (res.ok) {
      return await res.json();
    }
    return null;
  },

  async addWater(amount: number, source: string = 'manual'): Promise<boolean> {
    const res = await fetch('/api/water/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, source })
    });
    return res.ok;
  },

  async updateWaterGoal(goal: number, isAI: boolean = false): Promise<boolean> {
    const res = await fetch('/api/water/goal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, isAI })
    });
    return res.ok;
  },

  async removeWater(id: number): Promise<boolean> {
    const res = await fetch(`/api/water/delete/${id}`, { method: 'DELETE' });
    return res.ok;
  },

  async fetchLatestPlan(): Promise<any | null> {
    const res = await fetch('/api/dashboard/latest-plan');
    if (res.ok) {
      return await res.json();
    }
    return null;
  },

  async fetchPlanHistory(): Promise<any[]> {
    const res = await fetch('/api/dashboard/history');
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
    return [];
  },

  async savePlan(planForm: { workout_plan: string, diet_plan: string, date: string }): Promise<boolean> {
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planForm)
    });
    return res.ok;
  },

  async togglePlanComplete(id: number, currentStatus: boolean): Promise<boolean> {
    const res = await fetch(`/api/plans/${id}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !currentStatus })
    });
    return res.ok;
  }
};
