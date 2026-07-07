import { z } from 'zod';

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

export const LogNutritionSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  calories_consumed: z.number().min(0).optional(),
  protein_g: z.number().min(0).optional(),
  carbs_g: z.number().min(0).optional(),
  fats_g: z.number().min(0).optional(),
  hydration_ml: z.number().min(0).optional(),
  notes: z.string().optional(),
});
export type LogNutritionDTO = z.infer<typeof LogNutritionSchema>;

export const LogRecoverySchema = z.object({
  date: z.string(), // YYYY-MM-DD
  sleep_hours: z.number().min(0).max(24).optional(),
  stress_level: z.number().min(1).max(10).optional(),
  soreness_level: z.number().min(1).max(10).optional(),
  energy_level: z.number().min(1).max(10).optional(),
});
export type LogRecoveryDTO = z.infer<typeof LogRecoverySchema>;

export const SetMemorySchema = z.object({
  category: z.string(),
  key: z.string(),
  value: z.any(),
});
export type SetMemoryDTO = z.infer<typeof SetMemorySchema>;

// ==========================================
// AI CONTEXT DTOs (The only objects the LLM sees)
// ==========================================

export interface IdentityContextDTO {
  memberId: string;
  name?: string;
  isPremium: boolean;
}

export interface WorkoutContextDTO {
  recentSessions: any[]; // Summarized list of recent workouts
  currentProgram?: string;
}

export interface ProgressContextDTO {
  workoutCount: number;
  currentStreak: number;
  lifetimeVolumeKg: number;
  recentAchievements: string[];
}

export interface NutritionContextDTO {
  averageCaloriesLast7Days: number;
  hydrationTrend: 'Increasing' | 'Decreasing' | 'Stable';
}

export interface RecoveryContextDTO {
  currentReadinessScore: number;
  recentSleepAvg: number;
  fatigueWarning: boolean;
}

export interface MemoryContextDTO {
  preferences: Record<string, any>;
  injuries: Record<string, any>;
  goals: Record<string, any>;
}

/**
 * The ultimate Context Object passed to the Prompt Builder
 */
export interface UnifiedAIContextDTO {
  timestamp: string;
  identity: IdentityContextDTO;
  workout: WorkoutContextDTO;
  progress: ProgressContextDTO;
  nutrition: NutritionContextDTO;
  recovery: RecoveryContextDTO;
  memory: MemoryContextDTO;
}
