import { IRepository } from '@shared/database/interfaces/IRepository';
import { Result } from '@shared/core/Result';
import { AppError } from '@errors/AppError';

export interface IWorkoutRepository extends IRepository<any> {
  findActiveProgram(userId: string): Promise<Result<any, AppError>>;
  findSessionsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Result<any[], AppError>>;
  findPersonalRecords(userId: string, exerciseId: string): Promise<Result<any[], AppError>>;
}
