import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from '@shared/database/repositories/BaseRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, NotFoundError } from '@errors/AppError';

export interface WorkoutPlanRecord {
  id: string;
  user_id: string;
  organization_id?: string | null;
  title: string;
  description?: string | null;
  schedule?: any;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export class WorkoutPlanRepository extends BaseRepository<WorkoutPlanRecord> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'v2_workout_plans');
  }

  public async getPlansForUser(userId: string): Promise<Result<WorkoutPlanRecord[], AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('v2_workout_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return ok((data || []) as WorkoutPlanRecord[]);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async getPlanById(planId: string, userId: string): Promise<Result<WorkoutPlanRecord | null, AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('v2_workout_plans')
        .select('*')
        .eq('id', planId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return ok(null);
        throw error;
      }
      return ok(data as WorkoutPlanRecord);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async createPlan(userId: string, planData: Partial<WorkoutPlanRecord>): Promise<Result<WorkoutPlanRecord, AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('v2_workout_plans')
        .insert({
          user_id: userId,
          organization_id: planData.organization_id || null,
          title: planData.title || 'Untitled Plan',
          description: planData.description || null,
          schedule: planData.schedule || {},
          is_active: planData.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return ok(data as WorkoutPlanRecord);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async updatePlan(planId: string, userId: string, updateData: Partial<WorkoutPlanRecord>): Promise<Result<WorkoutPlanRecord, AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('v2_workout_plans')
        .update(updateData)
        .eq('id', planId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') return fail(new NotFoundError('Plan not found or access denied'));
        throw error;
      }
      if (!data) return fail(new NotFoundError('Plan not found or access denied'));
      return ok(data as WorkoutPlanRecord);
    } catch (err: any) {
      if (err instanceof AppError) return fail(err);
      return fail(new AppError(err.message, 500));
    }
  }
}
