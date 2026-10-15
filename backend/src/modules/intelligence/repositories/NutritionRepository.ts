import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from '@shared/database/repositories/BaseRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { LogNutritionDTO } from '../domain/IntelligenceSchemas';

/**
 * @deprecated STRIVA V2 - Secondary intelligence nutrition adapter.
 * The canonical domain repository for member nutrition operations is located at:
 * backend/src/modules/nutrition/repositories/NutritionRepository.ts
 * This repository is retained for intelligence module legacy ingestion and writes to v2_nutrition_logs / water_logs.
 */
export class NutritionRepository extends BaseRepository<any> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'v2_nutrition_logs');
  }

  public async logNutrition(userId: string, dto: LogNutritionDTO): Promise<Result<any, AppError>> {
    try {
      const targetDate = dto.date || new Date().toISOString().split('T')[0];
      const calories = (dto as any).calories ?? dto.calories_consumed ?? 0;
      const protein_g = dto.protein_g ?? 0;
      const carbs_g = dto.carbs_g ?? 0;
      const fats_g = (dto as any).fats ?? (dto as any).fat_g ?? dto.fats_g ?? 0;
      const foodName = dto.notes || 'Logged Food';

      // 1. Insert meal log into v2_nutrition_logs (supports multiple meals per date)
      const { data: mealData, error: mealError } = await this.supabase
        .from('v2_nutrition_logs')
        .insert({
          user_id: userId,
          date: targetDate,
          meal_type: 'snack',
          food_name: foodName,
          calories,
          protein_g,
          carbs_g,
          fats_g,
        })
        .select()
        .single();

      if (mealError) throw mealError;

      // 2. If hydration is provided, log to water_logs using canonical profile_id
      const waterAmount = dto.hydration_ml ?? (dto as any).water_ml;
      if (waterAmount && waterAmount > 0) {
        await this.supabase
          .from('water_logs')
          .insert({
            profile_id: userId,
            amount_ml: waterAmount,
          });
      }

      return ok(mealData);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async getRecentLogs(userId: string, days: number = 7): Promise<Result<any[], AppError>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(days);
        
      if (error) throw error;
      return ok(data);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }
}
