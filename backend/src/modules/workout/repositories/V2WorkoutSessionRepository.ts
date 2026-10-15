import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from '@shared/database/repositories/BaseRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, NotFoundError } from '@errors/AppError';
import { WorkoutSession, WorkoutState, CompleteSetDTO, normalizeOptionalExerciseId } from '../domain/WorkoutSchemas';

export interface V2WorkoutSessionRecord {
  id: string;
  user_id: string;
  plan_id?: string | null;
  day_id?: string | null;
  state: WorkoutState;
  title?: string;
  started_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export class V2WorkoutSessionRepository extends BaseRepository<WorkoutSession> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'v2_workout_sessions');
  }

  public async startSession(userId: string, planId?: string, title?: string): Promise<Result<V2WorkoutSessionRecord, AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('v2_workout_sessions')
        .insert({
          user_id: userId,
          plan_id: planId || null,
          title: title || 'Workout Session',
          state: 'started',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return ok(data as V2WorkoutSessionRecord);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async getActiveSession(userId: string): Promise<Result<V2WorkoutSessionRecord | null, AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('v2_workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .in('state', ['started', 'paused'])
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return ok(data as V2WorkoutSessionRecord | null);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async transitionState(
    sessionId: string,
    userId: string,
    newState: WorkoutState,
    notes?: string
  ): Promise<Result<V2WorkoutSessionRecord, AppError>> {
    try {
      const { data: session, error: updateError } = await this.supabase
        .from('v2_workout_sessions')
        .update({
          state: newState,
          notes: notes || null,
          ...(newState === 'started' ? { started_at: new Date().toISOString() } : {}),
          ...(newState === 'completed' || newState === 'abandoned' ? { completed_at: new Date().toISOString() } : {})
        })
        .eq('id', sessionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) throw updateError;
      if (!session) return fail(new NotFoundError('Session not found or access denied'));

      return ok(session as V2WorkoutSessionRecord);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async completeSet(setId: string, userId: string, data: CompleteSetDTO): Promise<Result<void, AppError>> {
    try {
      // 1. Fetch set to discover associated session
      const { data: setRecord, error: setFetchError } = await this.supabase
        .from('exercise_sets')
        .select('id, session_id')
        .eq('id', setId)
        .maybeSingle();

      if (setFetchError) throw setFetchError;
      if (!setRecord) return fail(new NotFoundError('Exercise set not found'));

      // 2. Cross-user isolation: If linked to a session, verify session belongs to authenticated user
      if (setRecord.session_id) {
        const { data: sessionRecord, error: sessionFetchError } = await this.supabase
          .from('v2_workout_sessions')
          .select('id, user_id')
          .eq('id', setRecord.session_id)
          .maybeSingle();

        if (sessionFetchError) throw sessionFetchError;
        if (!sessionRecord || sessionRecord.user_id !== userId) {
          return fail(new AppError('Forbidden: Access denied to another member exercise set', 403));
        }
      }

      const { error } = await this.supabase
        .from('exercise_sets')
        .update({
          ...data,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', setId);

      if (error) throw error;
      return ok(undefined);
    } catch (err: any) {
      if (err instanceof AppError) return fail(err);
      return fail(new AppError(err.message, 500));
    }
  }

  public async createSet(sessionId: string, data: { exercise_id?: string | null; weight_kg?: number; reps?: number; rpe?: number }): Promise<Result<any, AppError>> {
    try {
      const normalizedExerciseId = normalizeOptionalExerciseId(data.exercise_id);
      const { data: created, error } = await this.supabase
        .from('exercise_sets')
        .insert({
          session_id: sessionId,
          exercise_id: normalizedExerciseId,
          weight_kg: data.weight_kg || 0,
          reps: data.reps || 0,
          rpe: data.rpe || null,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return ok(created);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async getHistory(userId: string, limit: number = 20): Promise<Result<V2WorkoutSessionRecord[], AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('v2_workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return ok((data || []) as V2WorkoutSessionRecord[]);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }
}
