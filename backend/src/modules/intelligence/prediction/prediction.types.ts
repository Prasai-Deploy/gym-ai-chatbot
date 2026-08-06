// ─── Core Prediction Types ───────────────────────────────────────────────────

export interface HealthMetrics {
  userId: string;
  weightKg?: number;
  bodyFatPct?: number;
  muscleMassKg?: number;
  restingHrBpm?: number;
  hrvMs?: number;
  vo2Max?: number;
  sleepHours?: number;
  recoveryScore?: number;
  streakDays?: number;
  weeklyWorkouts?: number;
  weeklyVolumeTons?: number;
  dailySteps?: number;
  calorieDeficit?: number;
  hydrationMl?: number;
  stressLevel?: number; // 0–10
}

export interface WorkoutPrediction {
  userId: string;
  predictedNextWorkoutDate: string;
  recommendedIntensity: 'easy' | 'moderate' | 'hard' | 'max_effort';
  predictedVolumeTons: number;
  estimatedOneRepMax: Record<string, number>; // e.g. { bench: 100, squat: 140 }
  plateauRisk: number;   // 0–1
  injuryRisk: number;    // 0–1
  confidence: number;    // 0–1
}

export interface NutritionPrediction {
  userId: string;
  recommendedCalories: number;
  recommendedProteinG: number;
  recommendedCarbsG: number;
  recommendedFatsG: number;
  predictedWeightChangeKg: number; // per week
  deficitOrSurplus: 'deficit' | 'maintenance' | 'surplus';
  confidence: number;
}

export interface RecoveryPrediction {
  userId: string;
  predictedRecoveryScore: number;
  readinessLabel: 'not_ready' | 'light_training' | 'ready' | 'peak';
  estimatedSleepNeedHours: number;
  fatigueLevel: number; // 0–10
  recommendations: string[];
  confidence: number;
}

export interface GoalForecast {
  userId: string;
  goalType: string;
  currentValue: number;
  targetValue: number;
  predictedAchievementDate: string;
  onTrack: boolean;
  requiredWeeklyDelta: number;
  confidence: number;
}

export interface BusinessForecast {
  organizationId: string;
  period: 'monthly' | 'quarterly' | 'annual';
  predictedMRR: number;
  predictedNewMembers: number;
  predictedChurnRate: number;
  predictedAttendance: number;
  revenueGrowthPct: number;
  churnRiskMemberIds: string[];
  confidence: number;
}

export interface HealthScore {
  userId: string;
  overallScore: number;       // 0–100
  fitnessScore: number;       // 0–100 (strength + cardio + consistency)
  nutritionScore: number;     // 0–100 (macro adherence + hydration)
  recoveryScore: number;      // 0–100 (sleep + HRV + stress)
  bodyCompositionScore: number; // 0–100 (body fat trend + muscle mass)
  grade: 'F' | 'D' | 'C' | 'B' | 'A' | 'S';
  trend: 'declining' | 'stable' | 'improving';
  breakdown: Record<string, number>;
  calculatedAt: string;
}

export interface AIInsight {
  id: string;
  userId: string;
  category: 'workout' | 'nutrition' | 'recovery' | 'business' | 'goal' | 'risk';
  severity: 'info' | 'warning' | 'alert' | 'achievement';
  title: string;
  summary: string;
  reasoning: string;          // Explainable AI narrative
  actionItems: string[];
  confidence: number;
  createdAt: string;
}

export interface ScenarioResult {
  scenarioName: string;
  assumptions: Record<string, any>;
  projectedOutcome: Record<string, any>;
  probability: number;
  riskLevel: 'low' | 'medium' | 'high';
}
