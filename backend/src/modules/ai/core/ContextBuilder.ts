import { SupabaseClient } from '@supabase/supabase-js';
import { IdentityService } from '../../identity/services/IdentityService';
import { WorkoutExecutionService } from '../../workout/services/WorkoutExecutionService';
import { NutritionService } from '../../nutrition/services/NutritionService';
import { ProgressAnalyticsService } from '../../progress/services/ProgressAnalyticsService';

export interface UserFitnessContext {
  userId: string;
  profile: any;
  fitnessProfile: any;
  goals: any[];
  todayWorkout: any;
  nutrition: any;
  recovery: any;
  progress: any;
  telemetryStatus: {
    nutritionOnline: boolean;
    workoutOnline: boolean;
  };
}

export class ContextBuilder {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly identityService?: IdentityService,
    private readonly workoutService?: WorkoutExecutionService,
    private readonly nutritionService?: NutritionService,
    private readonly progressService?: ProgressAnalyticsService
  ) {}

  public async buildContext(userId: string): Promise<UserFitnessContext> {
    const getGoals = async () => {
      try {
        const { data } = await this.supabase.from('user_goals').select('*').eq('user_id', userId).eq('status', 'ACTIVE');
        return data || [];
      } catch {
        return [];
      }
    };

    const getRecovery = async () => {
      try {
        const { data } = await this.supabase.from('recovery_logs').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(1).maybeSingle();
        return data || null;
      } catch {
        return null;
      }
    };

    const [profileRes, fitnessRes, goalsData, workoutRes, nutritionRes, recoveryData, statsRes] = await Promise.all([
      this.identityService ? this.identityService.getProfile(userId).catch(() => null) : null,
      this.identityService ? this.identityService.getFitnessProfile(userId).catch(() => null) : null,
      getGoals(),
      this.workoutService ? this.workoutService.getTodayWorkout(userId).catch(() => null) : null,
      this.nutritionService ? this.nutritionService.getDailySummary(userId).catch(() => null) : null,
      getRecovery(),
      this.progressService ? this.progressService.getStatistics(userId).catch(() => null) : null,
    ]);

    const profile = (profileRes && 'isSuccess' in profileRes && profileRes.isSuccess()) ? profileRes.value : null;
    const fitnessProfile = (fitnessRes && 'isSuccess' in fitnessRes && fitnessRes.isSuccess()) ? fitnessRes.value : null;
    const workoutOnline = workoutRes !== null && 'isSuccess' in workoutRes && workoutRes.isSuccess();
    const nutritionOnline = nutritionRes !== null && 'isSuccess' in nutritionRes && nutritionRes.isSuccess();
    const todayWorkout = workoutOnline ? workoutRes.value : null;
    const nutrition = nutritionOnline ? nutritionRes.value : null;
    const progress = (statsRes && 'isSuccess' in statsRes && statsRes.isSuccess()) ? statsRes.value : null;

    return {
      userId,
      profile,
      fitnessProfile,
      goals: goalsData || [],
      todayWorkout,
      nutrition,
      recovery: recoveryData,
      progress,
      telemetryStatus: {
        nutritionOnline,
        workoutOnline,
      },
    };
  }

  public formatContextSummary(ctx: UserFitnessContext): string {
    const lines: string[] = ['=== USER FITNESS CONTEXT ==='];

    if (ctx.profile) {
      lines.push(`Profile: ${ctx.profile.full_name || 'Member'} (${ctx.profile.email})`);
    }
    if (ctx.fitnessProfile) {
      lines.push(`Fitness Level: ${ctx.fitnessProfile.level || 'intermediate'}, Height: ${ctx.fitnessProfile.height_cm || 'N/A'}cm, Target Weight: ${ctx.fitnessProfile.target_weight_kg || 'N/A'}kg`);
    }
    if (ctx.goals && ctx.goals.length > 0) {
      lines.push(`Active Goals: ${ctx.goals.map((g: any) => `${g.goal_type} (Target: ${g.target_value})`).join(', ')}`);
    } else {
      lines.push('Active Goals: None set');
    }
    if (ctx.todayWorkout) {
      const active = ctx.todayWorkout.activeSession;
      const plan = ctx.todayWorkout.latestPlan;
      lines.push(`Today Workout: ${active ? `Active session '${active.title || 'Workout'}' (${active.state})` : plan ? `Plan '${plan.title}' available` : 'No active workout scheduled'}`);
    } else if (ctx.telemetryStatus && !ctx.telemetryStatus.workoutOnline) {
      lines.push('Today Workout: [Telemetry Offline - database query failed]');
    }
    if (ctx.nutrition) {
      lines.push(`Nutrition Today: ${ctx.nutrition.totalCalories} kcal consumed (Protein: ${ctx.nutrition.totalProtein}g, Carbs: ${ctx.nutrition.totalCarbs}g, Fats: ${ctx.nutrition.totalFats}g, Water: ${ctx.nutrition.totalWaterMl}ml)`);
    } else if (ctx.telemetryStatus && !ctx.telemetryStatus.nutritionOnline) {
      lines.push('Nutrition Today: [Telemetry Offline - database query failed]');
    }
    if (ctx.recovery) {
      lines.push(`Recovery: Score ${ctx.recovery.readiness_score || 'N/A'}/100, Sleep: ${ctx.recovery.sleep_hours || 'N/A'}h, Soreness: ${ctx.recovery.soreness_level || 'N/A'}/10`);
    }
    if (ctx.progress) {
      lines.push(`Progress Stats: Workouts logged: ${ctx.progress.workout_count || 0}, Current streak: ${ctx.progress.current_streak || 0} days`);
    }

    return lines.join('\n');
  }
}
