import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from '@shared/database/repositories/BaseRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { LogNutritionDTO } from '../domain/IntelligenceSchemas';

export class NutritionRepository extends BaseRepository<any> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'v2_nutrition_logs');
  }

  public async logNutrition(userId: string, dto: LogNutritionDTO): Promise<Result<any, AppError>> {
    try {
      const payload = { ...dto, user_id: userId };
      const { data, error } = await this.supabase
        .from(this.tableName)
        .upsert(payload, { onConflict: 'user_id,date' })
        .select()
        .single();
        
      if (error) throw error;
      return ok(data);
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
