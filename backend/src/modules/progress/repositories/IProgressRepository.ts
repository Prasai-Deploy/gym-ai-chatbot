import { IRepository } from '@shared/database/interfaces/IRepository';
import { Result } from '@shared/core/Result';
import { AppError } from '@errors/AppError';

export interface IProgressRepository extends IRepository<any> {
  findLatestSnapshot(userId: string): Promise<Result<any, AppError>>;
  findConsistencyStreak(userId: string): Promise<Result<any, AppError>>;
}
