import { IRepository } from '@shared/database/interfaces/IRepository';
import { Result } from '@shared/core/Result';
import { AppError } from '@errors/AppError';

export interface IRecoveryRepository extends IRepository<any> {
  findDailyRecovery(userId: string, date: Date): Promise<Result<any, AppError>>;
}
