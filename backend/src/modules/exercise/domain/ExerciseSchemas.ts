import { z } from 'zod';

export const ExerciseDifficultySchema = z.enum(['beginner', 'intermediate', 'advanced']);

export const BaseExerciseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().nullable(),
  instructions: z.array(z.string()).default([]),
  difficulty: ExerciseDifficultySchema.default('beginner'),
  category_id: z.string().uuid().nullable(),
  movement_pattern_id: z.string().uuid().nullable(),
  exercise_type_id: z.string().uuid().nullable(),
  estimated_calories: z.number().nullable(),
  estimated_met: z.number().nullable(),
  image_url: z.string().url().nullable(),
  video_url: z.string().url().nullable(),
  thumbnail_url: z.string().url().nullable(),
});

export type Exercise = z.infer<typeof BaseExerciseSchema>;

export const CreateExerciseSchema = BaseExerciseSchema.omit({ id: true }).extend({
  primary_muscle_ids: z.array(z.string().uuid()).optional(),
  secondary_muscle_ids: z.array(z.string().uuid()).optional(),
  equipment_ids: z.array(z.string().uuid()).optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
});
export type CreateExerciseDTO = z.infer<typeof CreateExerciseSchema>;

export const UpdateExerciseSchema = CreateExerciseSchema.partial();
export type UpdateExerciseDTO = z.infer<typeof UpdateExerciseSchema>;

export const SearchExerciseQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().uuid().optional(),
  muscle: z.string().uuid().optional(),
  equipment: z.string().uuid().optional(),
  difficulty: ExerciseDifficultySchema.optional(),
  type: z.string().uuid().optional(),
  pattern: z.string().uuid().optional(),
});
export type SearchExerciseQuery = z.infer<typeof SearchExerciseQuerySchema>;
