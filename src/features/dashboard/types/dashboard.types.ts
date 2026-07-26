export interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
  water_goal?: number;
  calorie_goal?: number;
  protein_goal?: number;
  carb_goal?: number;
  fat_goal?: number;
  is_admin?: boolean;
}

export interface ProgressData {
  id?: number;
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  water: number;
  workout_name: string;
}

export interface DailyPlan {
  id: number;
  date: string;
  workout_plan: string;
  diet_plan: string;
  completed: boolean;
}

export interface WaterLog {
  id: number;
  intake_amount: number;
  source: string;
  created_at: string;
}

export interface WaterSummary {
  total_consumed: number;
  daily_goal: number;
  completion_percentage: number;
}

export interface ActivityItem {
  id?: number;
  activity_type: string;
  activity_title: string;
  activity_description: string;
  created_at: string;
}

export interface ChartData {
  date: string;
  calories_burned?: number;
  workouts_completed?: number;
  hydration_completion?: number;
  exercises_completed?: number;
  workout_duration?: number;
}

export interface WeeklySummary {
  total_calories: number;
  total_workouts: number;
  avg_hydration: number;
  avg_diet: number;
}

export interface TodayPlan {
  id?: number;
  workout_title?: string;
  diet_title?: string;
  difficulty?: string;
  duration?: string;
  workout_exercises?: any[];
  diet_meals?: any[];
  calories_target?: number;
  protein_goal?: number;
  carb_goal?: number;
  fat_goal?: number;
}

export interface DashboardData {
  today_stats?: {
    protein: number;
    carbs: number;
    fats: number;
    calories_consumed: number;
    calories_burned: number;
    water_ml: number;
    completed_percentage?: number;
  };
  recent_workouts?: ProgressData[];
  today_plan?: TodayPlan;
}

export type ChartMetric = 'calories_burned' | 'workouts_completed' | 'exercises_completed' | 'workout_duration' | 'hydration_completion';
