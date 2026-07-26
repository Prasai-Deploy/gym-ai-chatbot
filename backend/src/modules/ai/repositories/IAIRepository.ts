import { IRepository } from '@shared/database/interfaces/IRepository';
import { Result } from '@shared/core/Result';
import { AppError } from '@errors/AppError';

export interface IAIRepository extends IRepository<any> {
  saveContextSnapshot(userId: string, payload: any): Promise<Result<void, AppError>>;
  findRecentMemories(userId: string, category: string): Promise<Result<any[], AppError>>;
}
