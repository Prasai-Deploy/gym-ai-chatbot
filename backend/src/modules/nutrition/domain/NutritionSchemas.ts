import { z } from 'zod';

export const MealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export type MealType = z.infer<typeof MealTypeSchema>;

export const CreateNutritionLogSchema = z.object({
  date: z.string().optional(),
  meal_type: MealTypeSchema.default('snack'),
  food_name: z.string().min(1),
  calories: z.number().min(0),
  protein_g: z.number().min(0).optional().default(0),
  carbs_g: z.number().min(0).optional().default(0),
  fats_g: z.number().min(0).optional().default(0),
});
export type CreateNutritionLogDTO = z.infer<typeof CreateNutritionLogSchema>;

export const UpdateNutritionLogSchema = CreateNutritionLogSchema.partial();
export type UpdateNutritionLogDTO = z.infer<typeof UpdateNutritionLogSchema>;

export const AddWaterLogSchema = z.object({
  amount_ml: z.number().positive(),
  date: z.string().optional(),
});
export type AddWaterLogDTO = z.infer<typeof AddWaterLogSchema>;

export interface NutritionLogRecord {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  created_at?: string;
}

export interface WaterLogRecord {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at?: string;
  created_at?: string;
}
