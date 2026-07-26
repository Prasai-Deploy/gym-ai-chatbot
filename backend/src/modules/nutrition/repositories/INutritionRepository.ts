import { IRepository } from '@shared/database/interfaces/IRepository';
import { Result } from '@shared/core/Result';
import { AppError } from '@errors/AppError';

export interface INutritionRepository extends IRepository<any> {
  findMealLogsByDate(userId: string, date: Date): Promise<Result<any[], AppError>>;
  lockMealLog(logId: string): Promise<Result<void, AppError>>;
}
