import { z } from 'zod';

export const WorkoutStateSchema = z.enum([
  'planned', 'ready', 'started', 'paused', 'completed', 'abandoned', 'cancelled'
]);
export type WorkoutState = z.infer<typeof WorkoutStateSchema>;

export const SetStatusSchema = z.enum(['planned', 'completed', 'skipped']);

// -- PLANNING --
export const CreateProgramSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
});
export type CreateProgramDTO = z.infer<typeof CreateProgramSchema>;

// -- EXECUTION --
export const StateTransitionSchema = z.object({
  state: WorkoutStateSchema,
  notes: z.string().optional(),
});
export type StateTransitionDTO = z.infer<typeof StateTransitionSchema>;

export const CompleteSetSchema = z.object({
  weight_kg: z.number().min(0).max(1000).optional(),
  reps: z.number().min(0).max(1000).optional(),
  rpe: z.number().min(0).max(10).optional(),
  tempo: z.string().optional(),
  rest_time_seconds: z.number().min(0).optional(),
});
export type CompleteSetDTO = z.infer<typeof CompleteSetSchema>;

// Core Types
export interface WorkoutSession {
  id: string;
  user_id: string;
  day_id: string | null;
  state: WorkoutState;
  started_at: Date | null;
  completed_at: Date | null;
}

export interface ExerciseSet {
  id: string;
  exercise_session_id: string;
  set_number: number;
  weight_kg?: number;
  reps?: number;
  rpe?: number;
  tempo?: string;
  rest_time_seconds?: number;
  status: 'planned' | 'completed' | 'skipped';
  completed_at?: Date;
}
