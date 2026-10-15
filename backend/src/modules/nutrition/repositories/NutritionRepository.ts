import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from '@shared/database/repositories/BaseRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, NotFoundError } from '@errors/AppError';
import { NutritionLogRecord, WaterLogRecord, CreateNutritionLogDTO, UpdateNutritionLogDTO, AddWaterLogDTO } from '../domain/NutritionSchemas';
import { logger } from '@logger/index';

export class NutritionRepository extends BaseRepository<NutritionLogRecord> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'v2_nutrition_logs');
  }

  public async getDailyLogs(userId: string, dateStr: string): Promise<Result<NutritionLogRecord[], AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('v2_nutrition_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', dateStr)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error({ err: error, userId, dateStr }, '[NutritionRepository] Error querying v2_nutrition_logs');
        return fail(new AppError(`Database error querying nutrition logs: ${error.message}`, 500));
      }
      return ok((data || []) as NutritionLogRecord[]);
    } catch (err: any) {
      logger.error({ err, userId, dateStr }, '[NutritionRepository] Exception querying v2_nutrition_logs');
      return fail(new AppError(err.message, 500));
    }
  }

  public async getLogsRange(userId: string, limit: number = 50): Promise<Result<NutritionLogRecord[], AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('v2_nutrition_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error({ err: error, userId }, '[NutritionRepository] Error querying logs range');
        return fail(new AppError(error.message, 500));
      }
      return ok((data || []) as NutritionLogRecord[]);
    } catch (err: any) {
      logger.error({ err, userId }, '[NutritionRepository] Exception querying logs range');
      return fail(new AppError(err.message, 500));
    }
  }

  public async createNutritionLog(userId: string, dto: CreateNutritionLogDTO): Promise<Result<NutritionLogRecord, AppError>> {
    try {
      const dateStr = dto.date || new Date().toISOString().split('T')[0];
      const { data, error } = await this.supabase
        .from('v2_nutrition_logs')
        .insert({
          user_id: userId,
          date: dateStr,
          meal_type: dto.meal_type,
          food_name: dto.food_name,
          calories: dto.calories,
          protein_g: dto.protein_g ?? 0,
          carbs_g: dto.carbs_g ?? 0,
          fats_g: dto.fats_g ?? 0,
        })
        .select()
        .single();

      if (error) {
        logger.error({ err: error, userId }, '[NutritionRepository] Error inserting meal log');
        return fail(new AppError(error.message, 500));
      }
      return ok(data as NutritionLogRecord);
    } catch (err: any) {
      logger.error({ err, userId }, '[NutritionRepository] Exception inserting meal log');
      return fail(new AppError(err.message, 500));
    }
  }

  public async updateNutritionLog(logId: string, userId: string, dto: UpdateNutritionLogDTO): Promise<Result<NutritionLogRecord, AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('v2_nutrition_logs')
        .update(dto)
        .eq('id', logId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return fail(new NotFoundError('Nutrition log not found or access denied'));
        }
        logger.error({ err: error, logId, userId }, '[NutritionRepository] Error updating meal log');
        return fail(new AppError(error.message, 500));
      }
      if (!data) return fail(new NotFoundError('Nutrition log not found or access denied'));
      return ok(data as NutritionLogRecord);
    } catch (err: any) {
      if (err instanceof AppError) return fail(err);
      logger.error({ err, logId, userId }, '[NutritionRepository] Exception updating meal log');
      return fail(new AppError(err.message, 500));
    }
  }

  public async deleteNutritionLog(logId: string, userId: string): Promise<Result<void, AppError>> {
    try {
      const { error } = await this.supabase
        .from('v2_nutrition_logs')
        .delete()
        .eq('id', logId)
        .eq('user_id', userId);

      if (error) {
        logger.error({ err: error, logId, userId }, '[NutritionRepository] Error deleting meal log');
        return fail(new AppError(error.message, 500));
      }
      return ok(undefined);
    } catch (err: any) {
      logger.error({ err, logId, userId }, '[NutritionRepository] Exception deleting meal log');
      return fail(new AppError(err.message, 500));
    }
  }

  // -- WATER LOGS (Optional Telemetry Source, Phase 9B Bridged) --
  public async getWaterLogs(userId: string, dateStr: string): Promise<Result<WaterLogRecord[], AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('water_logs')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.warn({ err: error, userId, dateStr }, '[NutritionRepository] water_logs query failed');
        return fail(new AppError(`Hydration query failed: ${error.message}`, 500));
      }
      return ok((data || []) as WaterLogRecord[]);
    } catch (err: any) {
      logger.warn({ err, userId, dateStr }, '[NutritionRepository] water_logs query exception');
      return fail(new AppError(err.message, 500));
    }
  }

  public async addWaterLog(userId: string, dto: AddWaterLogDTO): Promise<Result<WaterLogRecord, AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('water_logs')
        .insert({
          profile_id: userId,
          amount_ml: dto.amount_ml,
        })
        .select()
        .single();

      if (error) {
        logger.warn({ err: error, userId }, '[NutritionRepository] addWaterLog failed');
        return fail(new AppError(error.message, 500));
      }
      return ok(data as WaterLogRecord);
    } catch (err: any) {
      logger.warn({ err, userId }, '[NutritionRepository] addWaterLog exception');
      return fail(new AppError(err.message, 500));
    }
  }

  public async deleteWaterLog(logId: string, userId: string): Promise<Result<void, AppError>> {
    try {
      const { error } = await this.supabase
        .from('water_logs')
        .delete()
        .eq('id', logId)
        .eq('profile_id', userId);

      if (error) {
        logger.warn({ err: error, logId, userId }, '[NutritionRepository] deleteWaterLog failed');
        return fail(new AppError(`Delete water log failed: ${error.message}`, 500));
      }
      return ok(undefined);
    } catch (err: any) {
      logger.warn({ err, logId, userId }, '[NutritionRepository] deleteWaterLog exception');
      return fail(new AppError(err.message, 500));
    }
  }
}
