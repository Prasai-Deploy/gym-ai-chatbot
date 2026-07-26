import { z } from 'zod';

export const SnapshotTypeSchema = z.enum(['daily', 'weekly', 'monthly']);
export type SnapshotType = z.infer<typeof SnapshotTypeSchema>;

export interface ProgressStatistics {
  user_id: string;
  workout_count: number;
  lifetime_volume_kg: number;
  total_training_time_seconds: number;
  current_streak: number;
  longest_streak: number;
  last_workout_date: Date | null;
}

export interface ProgressSnapshot {
  id: string;
  user_id: string;
  type: SnapshotType;
  snapshot_date: string;
  data: any;
}
