import { NutritionRepository } from '../repositories/NutritionRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { LogNutritionDTO, NutritionContextDTO } from '../domain/IntelligenceSchemas';
import { eventBus } from '@shared/core/EventBus';

export class NutritionService {
  constructor(private readonly repository: NutritionRepository) {}

  public async logNutrition(userId: string, dto: LogNutritionDTO): Promise<Result<any, AppError>> {
    const result = await this.repository.logNutrition(userId, dto);
    if (result.isSuccess()) {
      eventBus.publish('Nutrition.LOGGED', { userId, date: dto.date });
    }
    return result;
  }

  public async getNutritionContext(userId: string): Promise<Result<NutritionContextDTO, AppError>> {
    const logsRes = await this.repository.getRecentLogs(userId, 7);
    if (logsRes.isFailure()) return logsRes as Result<any, AppError>;
    
    const logs = logsRes.value;
    let totalCals = 0;
    
    logs.forEach(log => {
      totalCals += (log.calories_consumed || 0);
    });

    const averageCalories = logs.length > 0 ? Math.round(totalCals / logs.length) : 0;
    
    return ok({
      averageCaloriesLast7Days: averageCalories,
      hydrationTrend: 'Stable' // Stubbed for slice
    });
  }
}
