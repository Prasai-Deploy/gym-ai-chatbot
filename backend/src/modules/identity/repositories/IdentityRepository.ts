import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from '@shared/database/repositories/BaseRepository';
import { IIdentityRepository } from './IIdentityRepository';
import { Profile, FitnessProfile, UserPreferences, MemberSettings } from '../domain/IdentitySchemas';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, NotFoundError } from '@errors/AppError';
import { logger } from '@logger/index';

export class IdentityRepository extends BaseRepository<Profile> implements IIdentityRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'profiles');
  }

  // Find profile by Auth ID is effectively findById since auth.uid() == profile.id
  public async findByAuthId(authId: string): Promise<Result<Profile | null, AppError>> {
    return this.findById(authId);
  }

  public async findFitnessProfile(userId: string): Promise<Result<FitnessProfile | null, AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('fitness_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return ok(null);
        throw error;
      }
      return ok(data as FitnessProfile);
    } catch (err: any) {
      logger.error({ err, userId }, 'Error in findFitnessProfile');
      return fail(new AppError(err.message, 500));
    }
  }

  public async updateFitnessProfile(userId: string, data: Partial<FitnessProfile>): Promise<Result<FitnessProfile, AppError>> {
    try {
      const { data: updated, error } = await this.supabase
        .from('fitness_profiles')
        .update(data)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      if (!updated) return fail(new NotFoundError('Fitness Profile not found'));
      
      return ok(updated as FitnessProfile);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async findPreferences(userId: string): Promise<Result<UserPreferences | null, AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return ok(null);
        throw error;
      }
      return ok(data as UserPreferences);
    } catch (err: any) {
      logger.error({ err, userId }, 'Error in findPreferences');
      return fail(new AppError(err.message, 500));
    }
  }

  public async updatePreferences(userId: string, data: Partial<UserPreferences>): Promise<Result<UserPreferences, AppError>> {
    try {
      const { data: updated, error } = await this.supabase
        .from('user_preferences')
        .update(data)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      if (!updated) return fail(new NotFoundError('Preferences not found'));
      
      return ok(updated as UserPreferences);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async resetDemoData(userId: string): Promise<Result<void, AppError>> {
    try {
      // Using a batch of deletes to clean up demo user data
      // (Using the standard supabase client; relies on RLS allowing deletion for their own userId)
      await Promise.all([
        this.supabase.from('progress').delete().eq('user_id', userId),
        this.supabase.from('daily_plans').delete().eq('user_id', userId),
        this.supabase.from('fitness_profiles').delete().eq('id', userId), // Identity uses 'id' instead of 'user_id'
        this.supabase.from('user_preferences').delete().eq('id', userId),
        this.supabase.from('workout_plans').delete().eq('user_id', userId),
        this.supabase.from('workout_sessions').delete().eq('user_id', userId),
        this.supabase.from('chatbot_generated_plans').delete().eq('user_id', userId),
        this.supabase.from('workout_logs').delete().eq('user_id', userId),
        this.supabase.from('progress_logs').delete().eq('user_id', userId),
        this.supabase.from('chatbot_generated_workouts').delete().eq('user_id', userId),
        this.supabase.from('chatbot_generated_diets').delete().eq('user_id', userId),
        this.supabase.from('user_fitness_plans').delete().eq('user_id', userId),
        this.supabase.from('user_meal_tracking').delete().eq('user_id', userId),
        this.supabase.from('user_progress').delete().eq('user_id', userId),
      ]);
      
      return ok(undefined);
    } catch (err: any) {
      logger.error({ err, userId }, 'Error in resetDemoData');
      return fail(new AppError(err.message, 500));
    }
  }
}

