import { z } from 'zod';
import { BaseTool, ToolContext } from '../BaseTool';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, ValidationError } from '@errors/AppError';
import { IdentityService } from '../../../identity/services/IdentityService';
import { WorkoutExecutionService } from '../../../workout/services/WorkoutExecutionService';
import { NutritionService } from '../../../nutrition/services/NutritionService';
import { ProgressAnalyticsService } from '../../../progress/services/ProgressAnalyticsService';
import { SupabaseClient } from '@supabase/supabase-js';

// 1. get_profile
export class GetProfileTool extends BaseTool<any, any> {
  public readonly name = 'get_profile';
  public readonly description = 'Retrieves member personal profile, physical metrics, and fitness preferences.';
  public readonly inputSchema = z.object({}).catchall(z.any());

  constructor(private readonly identityService: IdentityService) {
    super();
  }

  protected async executeImpl(_input: any, context: ToolContext): Promise<Result<any, AppError>> {
    try {
      const profileRes = await this.identityService.getProfile(context.userId);
      const fitnessRes = await this.identityService.getFitnessProfile(context.userId);

      const profile = profileRes.isSuccess() ? profileRes.value : null;
      const fitness = fitnessRes.isSuccess() ? fitnessRes.value : null;

      return ok({
        success: true,
        data: { profile, fitness },
      });
    } catch (err: any) {
      return fail(new AppError(`Failed to retrieve profile: ${err.message}`, 500));
    }
  }
}

// 2. get_goals
export class GetGoalsTool extends BaseTool<any, any> {
  public readonly name = 'get_goals';
  public readonly description = 'Retrieves target health, fitness, and body composition goals for the user.';
  public readonly inputSchema = z.object({}).catchall(z.any());

  constructor(private readonly supabase: SupabaseClient) {
    super();
  }

  protected async executeImpl(_input: any, context: ToolContext): Promise<Result<any, AppError>> {
    try {
      let query = this.supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', context.userId)
        .eq('status', 'ACTIVE');

      const { data, error } = await query;

      if (error) {
        return fail(new AppError(`Database error fetching user goals: ${error.message}`, 500));
      }

      return ok({
        success: true,
        data: data || [],
      });
    } catch (err: any) {
      return fail(new AppError(err.message || 'Failed to fetch user goals', 500));
    }
  }
}

// 3. get_today_workout
export class GetTodayWorkoutTool extends BaseTool<any, any> {
  public readonly name = 'get_today_workout';
  public readonly description = "Retrieves today's active workout plan, planned exercises, or in-progress session.";
  public readonly inputSchema = z.object({}).catchall(z.any());

  constructor(private readonly workoutService: WorkoutExecutionService) {
    super();
  }

  protected async executeImpl(_input: any, context: ToolContext): Promise<Result<any, AppError>> {
    const res = await this.workoutService.getTodayWorkout(context.userId);
    if (res.isFailure()) {
      return fail(res.error);
    }
    return ok({
      success: true,
      data: res.value,
    });
  }
}

// 4. get_progress
export class GetProgressTool extends BaseTool<any, any> {
  public readonly name = 'get_progress';
  public readonly description = 'Retrieves historical workout stats, streaks, bodyweight changes, and achievements.';
  public readonly inputSchema = z.object({}).catchall(z.any());

  constructor(private readonly progressService: ProgressAnalyticsService) {
    super();
  }

  protected async executeImpl(_input: any, context: ToolContext): Promise<Result<any, AppError>> {
    try {
      const statsRes = await this.progressService.getStatistics(context.userId);
      const snapshotsRes = await this.progressService.getSnapshots(context.userId);

      return ok({
        success: true,
        data: {
          statistics: statsRes.isSuccess() ? statsRes.value : null,
          snapshots: snapshotsRes.isSuccess() ? snapshotsRes.value : [],
        },
      });
    } catch (err: any) {
      return fail(new AppError(`Failed to fetch progress information: ${err.message}`, 500));
    }
  }
}

// 5. get_nutrition
export class GetNutritionTool extends BaseTool<{ date?: string }, any> {
  public readonly name = 'get_nutrition';
  public readonly description = 'Retrieves daily calorie and macronutrient breakdown for a given date.';
  public readonly inputSchema = z.object({
    date: z.string().optional(),
  }).catchall(z.any());

  constructor(private readonly nutritionService: NutritionService) {
    super();
  }

  protected async executeImpl(input: { date?: string }, context: ToolContext): Promise<Result<any, AppError>> {
    const res = await this.nutritionService.getDailySummary(context.userId, input.date);
    if (res.isFailure()) {
      return fail(res.error);
    }
    return ok({
      success: true,
      data: res.value,
    });
  }
}

// 6. get_recovery
export class GetRecoveryTool extends BaseTool<any, any> {
  public readonly name = 'get_recovery';
  public readonly description = 'Retrieves recent recovery indicators, sleep metrics, soreness, and readiness score.';
  public readonly inputSchema = z.object({}).catchall(z.any());

  constructor(private readonly supabase: SupabaseClient) {
    super();
  }

  protected async executeImpl(_input: any, context: ToolContext): Promise<Result<any, AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('recovery_logs')
        .select('*')
        .eq('user_id', context.userId)
        .order('date', { ascending: false })
        .limit(7);

      if (error) {
        return fail(new AppError(`Database error fetching recovery logs: ${error.message}`, 500));
      }

      return ok({
        success: true,
        data: data || [],
      });
    } catch (err: any) {
      return fail(new AppError(err.message || 'Failed to fetch recovery logs', 500));
    }
  }
}

// 7. create_workout
export class CreateWorkoutTool extends BaseTool<{ title: string; description?: string; schedule?: any }, any> {
  public readonly name = 'create_workout';
  public readonly description = 'Creates a new workout plan for the user.';
  public readonly inputSchema = z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    schedule: z.any().optional(),
  }).catchall(z.any());

  constructor(private readonly workoutService: WorkoutExecutionService) {
    super();
  }

  protected async executeImpl(input: any, context: ToolContext): Promise<Result<any, AppError>> {
    const res = await this.workoutService.createPlan(context.userId, {
      title: input.title,
      description: input.description,
      schedule: input.schedule,
    });

    if (res.isFailure()) {
      return fail(res.error);
    }

    return ok({
      success: true,
      data: res.value,
    });
  }
}

// 8. modify_workout
export class ModifyWorkoutTool extends BaseTool<{ planId?: string; sessionId?: string; state?: string; notes?: string; title?: string }, any> {
  public readonly name = 'modify_workout';
  public readonly description = 'Modifies an existing workout plan or transitions an active session state.';
  public readonly inputSchema = z.object({
    planId: z.string().optional(),
    sessionId: z.string().optional(),
    state: z.string().optional(),
    notes: z.string().optional(),
    title: z.string().optional(),
  }).catchall(z.any());

  constructor(private readonly workoutService: WorkoutExecutionService) {
    super();
  }

  protected async executeImpl(input: any, context: ToolContext): Promise<Result<any, AppError>> {
    if (input.sessionId && input.state) {
      const res = await this.workoutService.transitionSessionState(input.sessionId, context.userId, {
        state: input.state as any,
        notes: input.notes,
      });
      if (res.isFailure()) return fail(res.error);
      return ok({ success: true, data: res.value });
    }
    if (input.planId) {
      const res = await this.workoutService.updatePlan(input.planId, context.userId, {
        title: input.title,
        description: input.notes,
      });
      if (res.isFailure()) return fail(res.error);
      return ok({ success: true, data: res.value });
    }
    return fail(new ValidationError('Either planId or sessionId with state must be provided'));
  }
}

// 9. log_workout
export class LogWorkoutToolImpl extends BaseTool<{ sessionId?: string; exercise_id?: string; weight_kg?: number; reps?: number; rpe?: number }, any> {
  public readonly name = 'log_workout';
  public readonly description = 'Logs an exercise set or starts a new workout execution session.';
  public readonly inputSchema = z.object({
    sessionId: z.string().optional(),
    exercise_id: z.string().optional(),
    weight_kg: z.number().min(0).optional(),
    reps: z.number().min(0).optional(),
    rpe: z.number().min(0).max(10).optional(),
  }).catchall(z.any());

  constructor(private readonly workoutService: WorkoutExecutionService) {
    super();
  }

  protected async executeImpl(input: any, context: ToolContext): Promise<Result<any, AppError>> {
    if (input.sessionId) {
      const res = await this.workoutService.logSet(input.sessionId, context.userId, {
        exercise_id: input.exercise_id,
        weight_kg: input.weight_kg,
        reps: input.reps,
        rpe: input.rpe,
      });
      if (res.isFailure()) return fail(res.error);
      return ok({ success: true, data: res.value });
    }

    const res = await this.workoutService.startSession(context.userId, undefined, 'AI Logged Workout');
    if (res.isFailure()) return fail(res.error);
    return ok({ success: true, data: res.value });
  }
}

// 10. log_meal
export class LogMealTool extends BaseTool<{ food_name: string; calories: number; meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack'; protein_g?: number; carbs_g?: number; fats_g?: number; date?: string }, any> {
  public readonly name = 'log_meal';
  public readonly description = 'Logs a meal entry with calorie and macro counts.';
  public readonly inputSchema = z.object({
    food_name: z.string().min(1),
    calories: z.number().min(0),
    meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional().default('snack'),
    protein_g: z.number().min(0).optional(),
    carbs_g: z.number().min(0).optional(),
    fats_g: z.number().min(0).optional(),
    date: z.string().optional(),
  }).catchall(z.any());

  constructor(private readonly nutritionService: NutritionService) {
    super();
  }

  protected async executeImpl(input: any, context: ToolContext): Promise<Result<any, AppError>> {
    const res = await this.nutritionService.createMealLog(context.userId, {
      food_name: input.food_name,
      calories: input.calories,
      meal_type: input.meal_type || 'snack',
      protein_g: input.protein_g,
      carbs_g: input.carbs_g,
      fats_g: input.fats_g,
      date: input.date,
    });

    if (res.isFailure()) {
      return fail(res.error);
    }

    return ok({
      success: true,
      data: res.value,
    });
  }
}

// 11. log_water
export class LogWaterTool extends BaseTool<{ amount_ml: number; date?: string }, any> {
  public readonly name = 'log_water';
  public readonly description = 'Logs water intake volume in milliliters.';
  public readonly inputSchema = z.object({
    amount_ml: z.number().positive().max(10000, 'Unreasonable water volume'),
    date: z.string().optional(),
  }).catchall(z.any());

  constructor(private readonly nutritionService: NutritionService) {
    super();
  }

  protected async executeImpl(input: { amount_ml: number; date?: string }, context: ToolContext): Promise<Result<any, AppError>> {
    const res = await this.nutritionService.addWaterLog(context.userId, {
      amount_ml: input.amount_ml,
      date: input.date,
    });

    if (res.isFailure()) {
      return fail(res.error);
    }

    return ok({
      success: true,
      data: res.value,
    });
  }
}

// 12. update_goal
export class UpdateGoalTool extends BaseTool<{ goal_type: string; target_value?: number; current_value?: number; target_date?: string }, any> {
  public readonly name = 'update_goal';
  public readonly description = 'Updates or adds a user health or fitness goal.';
  public readonly inputSchema = z.object({
    goal_type: z.string().min(1),
    target_value: z.number().optional(),
    current_value: z.number().optional(),
    target_date: z.string().optional(),
  }).catchall(z.any());

  constructor(private readonly supabase: SupabaseClient) {
    super();
  }

  protected async executeImpl(input: any, context: ToolContext): Promise<Result<any, AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('user_goals')
        .upsert({
          user_id: context.userId,
          goal_type: input.goal_type,
          target_value: input.target_value || null,
          current_value: input.current_value || null,
          target_date: input.target_date || null,
          status: 'ACTIVE',
        })
        .select()
        .single();

      if (error) {
        return fail(new AppError(`Database persistence error updating user goal: ${error.message}`, 500));
      }

      return ok({
        success: true,
        data,
      });
    } catch (err: any) {
      return fail(new AppError(err.message || 'Failed to update user goal', 500));
    }
  }
}
