import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from '@shared/database/repositories/BaseRepository';
import { IIdentityRepository } from './IIdentityRepository';
import { Profile, FitnessProfile, UserPreferences, MemberSettings } from '../domain/IdentitySchemas';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, NotFoundError, ValidationError } from '@errors/AppError';
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
        .from('v2_fitness_profiles')
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
        .from('v2_fitness_profiles')
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

  public async findSettings(userId: string): Promise<Result<MemberSettings | null, AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('member_settings')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return ok(null);
        throw error;
      }
      return ok(data as MemberSettings);
    } catch (err: any) {
      logger.error({ err, userId }, 'Error in findSettings');
      return fail(new AppError(err.message, 500));
    }
  }

  public async updateSettings(userId: string, data: Partial<MemberSettings>): Promise<Result<MemberSettings, AppError>> {
    try {
      const { data: updated, error } = await this.supabase
        .from('member_settings')
        .upsert({ id: userId, ...data })
        .select()
        .single();

      if (error) throw error;
      if (!updated) return fail(new NotFoundError('Member Settings not found'));
      
      return ok(updated as MemberSettings);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  /**
   * STRIVA V2 — DB-4N: Hardened Demo Account Data Reset
   *
   * Cleans up all generated workout, nutrition, hydration, and profile records
   * strictly scoped to the verified demo user.
   *
   * TRANSACTION & FAILURE SEMANTICS:
   * - This method executes discrete PostgREST calls with strict fail-closed error handling.
   * - Step 1: Session lookup error aborts cleanup immediately.
   * - Step 2: Child `exercise_sets` are deleted BEFORE parent `v2_workout_sessions`.
   * - Step 3: Modern V2 records are deleted with per-query error verification.
   * - Step 4: Legacy records are deleted with per-query error verification.
   * - NOTE ON ATOMICITY: True database-level ACID multi-table atomicity requires a database RPC
   *   function (`reset_demo_account`). Because adding a new migration is not permitted in DB-4N,
   *   this interim solution ensures strict per-step error reporting and prevents reporting
   *   partial cleanup as a success.
   */
  public async resetDemoData(userId: string): Promise<Result<void, AppError>> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return fail(new ValidationError('Valid target userId is required for demo reset'));
    }

    try {
      // 1. Dependency-safe cleanup: query sessions first with mandatory error checking
      const { data: userSessions, error: sessionFetchError } = await this.supabase
        .from('v2_workout_sessions')
        .select('id')
        .eq('user_id', userId);

      if (sessionFetchError) {
        logger.error({ err: sessionFetchError, userId }, '[IdentityRepository] Failed to query demo sessions for cleanup');
        return fail(new AppError(`Demo reset aborted: session lookup failed: ${sessionFetchError.message}`, 500));
      }

      // 2. Delete child exercise sets BEFORE parent workout sessions
      if (userSessions && userSessions.length > 0) {
        const sessionIds = userSessions.map((s: any) => s.id);
        const { error: setsDeleteError } = await this.supabase
          .from('exercise_sets')
          .delete()
          .in('session_id', sessionIds);

        if (setsDeleteError) {
          logger.error({ err: setsDeleteError, userId, sessionIds }, '[IdentityRepository] Failed to delete child exercise_sets');
          return fail(new AppError(`Demo reset failed during exercise_sets cleanup: ${setsDeleteError.message}`, 500));
        }
      }

      // 3. Delete modern V2 domain records with per-query error checking
      const modernDeletes = [
        { table: 'v2_workout_sessions', column: 'user_id' },
        { table: 'v2_workout_plans', column: 'user_id' },
        { table: 'v2_nutrition_logs', column: 'user_id' },
        { table: 'water_logs', column: 'profile_id' },
      ];

      for (const item of modernDeletes) {
        const { error: modernDelErr } = await this.supabase
          .from(item.table)
          .delete()
          .eq(item.column, userId);

        if (modernDelErr) {
          logger.error({ err: modernDelErr, userId, table: item.table }, '[IdentityRepository] Error during modern demo table cleanup');
          return fail(new AppError(`Demo reset failed during ${item.table} cleanup: ${modernDelErr.message}`, 500));
        }
      }

      // 4. Delete legacy tables strictly scoped to target userId with error checking
      const legacyDeletes = [
        { table: 'progress', column: 'user_id' },
        { table: 'daily_plans', column: 'user_id' },
        { table: 'v2_fitness_profiles', column: 'id' },
        { table: 'user_preferences', column: 'id' },
        { table: 'workout_plans', column: 'user_id' },
        { table: 'workout_sessions', column: 'user_id' },
        { table: 'chatbot_generated_plans', column: 'user_id' },
        { table: 'workout_logs', column: 'user_id' },
        { table: 'progress_logs', column: 'user_id' },
        { table: 'chatbot_generated_workouts', column: 'user_id' },
        { table: 'chatbot_generated_diets', column: 'user_id' },
        { table: 'user_fitness_plans', column: 'user_id' },
        { table: 'user_meal_tracking', column: 'user_id' },
        { table: 'user_progress', column: 'user_id' },
      ];

      for (const item of legacyDeletes) {
        const { error: legacyDelErr } = await this.supabase
          .from(item.table)
          .delete()
          .eq(item.column, userId);

        if (legacyDelErr) {
          logger.warn({ err: legacyDelErr, userId, table: item.table }, '[IdentityRepository] Warning during legacy demo table cleanup');
          return fail(new AppError(`Demo reset failed during legacy ${item.table} cleanup: ${legacyDelErr.message}`, 500));
        }
      }
      
      return ok(undefined);
    } catch (err: any) {
      logger.error({ err, userId }, 'Exception in resetDemoData');
      return fail(new AppError(err.message, 500));
    }
  }
}

