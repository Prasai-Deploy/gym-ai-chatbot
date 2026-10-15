import { NutritionRepository } from '../repositories/NutritionRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { NutritionLogRecord, WaterLogRecord, CreateNutritionLogDTO, UpdateNutritionLogDTO, AddWaterLogDTO } from '../domain/NutritionSchemas';
import { logger } from '@logger/index';

export class NutritionService {
  constructor(private readonly repository: NutritionRepository) {}

  public async getDailySummary(userId: string, dateStr?: string): Promise<Result<{
    date: string;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    totalWaterMl: number;
    meals: NutritionLogRecord[];
  }, AppError>> {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const logsRes = await this.repository.getDailyLogs(userId, targetDate);
    if (logsRes.isFailure()) return logsRes as Result<any, AppError>;

    // Optional telemetry: hydration logs are safely degraded to 0 if absent or unavailable
    const waterRes = await this.repository.getWaterLogs(userId, targetDate);
    if (waterRes.isFailure()) {
      logger.warn({ userId, date: targetDate, error: waterRes.error.message }, '[NutritionService] Hydration telemetry unavailable, continuing with zero hydration');
    }

    const meals = logsRes.value;
    const totalCalories = meals.reduce((sum: number, m: NutritionLogRecord) => sum + (m.calories || 0), 0);
    const totalProtein = meals.reduce((sum: number, m: NutritionLogRecord) => sum + (m.protein_g || 0), 0);
    const totalCarbs = meals.reduce((sum: number, m: NutritionLogRecord) => sum + (m.carbs_g || 0), 0);
    const totalFats = meals.reduce((sum: number, m: NutritionLogRecord) => sum + (m.fats_g || 0), 0);

    const waterLogs = waterRes.isSuccess() ? waterRes.value : [];
    const totalWaterMl = waterLogs.reduce((sum: number, w: WaterLogRecord) => sum + (w.amount_ml || 0), 0);

    return ok({
      date: targetDate,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFats,
      totalWaterMl,
      meals,
    });
  }

  public async createMealLog(userId: string, dto: CreateNutritionLogDTO): Promise<Result<NutritionLogRecord, AppError>> {
    return this.repository.createNutritionLog(userId, dto);
  }

  public async updateMealLog(logId: string, userId: string, dto: UpdateNutritionLogDTO): Promise<Result<NutritionLogRecord, AppError>> {
    return this.repository.updateNutritionLog(logId, userId, dto);
  }

  public async deleteMealLog(logId: string, userId: string): Promise<Result<void, AppError>> {
    return this.repository.deleteNutritionLog(logId, userId);
  }

  public async getWaterLogs(userId: string, dateStr?: string): Promise<Result<WaterLogRecord[], AppError>> {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    return this.repository.getWaterLogs(userId, targetDate);
  }

  public async addWaterLog(userId: string, dto: AddWaterLogDTO): Promise<Result<WaterLogRecord, AppError>> {
    return this.repository.addWaterLog(userId, dto);
  }

  public async deleteWaterLog(logId: string, userId: string): Promise<Result<void, AppError>> {
    return this.repository.deleteWaterLog(logId, userId);
  }
}
