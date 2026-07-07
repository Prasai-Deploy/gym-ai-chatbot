import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from '@shared/database/repositories/BaseRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { WorkoutSession, WorkoutState, CompleteSetDTO } from '../domain/WorkoutSchemas';

export class WorkoutSessionRepository extends BaseRepository<WorkoutSession> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'v2_workout_sessions');
  }

  // State Machine transition that automatically appends to the event log
  public async transitionState(
    sessionId: string, 
    userId: string, 
    newState: WorkoutState, 
    notes?: string
  ): Promise<Result<WorkoutSession, AppError>> {
    try {
      // Because we lack PostgREST transactions, we'll do this sequentially here for the slice.
      // In production, this would call an RPC function.
      
      const { data: session, error: updateError } = await this.supabase
        .from('v2_workout_sessions')
        .update({ 
          state: newState,
          ...(newState === 'started' ? { started_at: new Date().toISOString() } : {}),
          ...(newState === 'completed' || newState === 'abandoned' ? { completed_at: new Date().toISOString() } : {})
        })
        .eq('id', sessionId)
        .eq('user_id', userId)
        .select()
        .single();
        
      if (updateError) throw updateError;
      
      // Append Event
      await this.supabase.from('workout_events').insert({
        workout_session_id: sessionId,
        event_type: `Workout.${newState.toUpperCase()}`,
        payload: { notes }
      });
      
      return ok(session as WorkoutSession);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async completeSet(setId: string, userId: string, data: CompleteSetDTO): Promise<Result<void, AppError>> {
    try {
      // Ensure the set belongs to the user (via RLS, but we can't easily join in an update without RPC)
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
      return fail(new AppError(err.message, 500));
    }
  }
}
