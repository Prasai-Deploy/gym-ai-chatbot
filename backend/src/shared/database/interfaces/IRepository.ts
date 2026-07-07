import { Result } from '@shared/core/Result';
import { AppError } from '@errors/AppError';

export interface IRepository<T, ID = string> {
  findById(id: ID): Promise<Result<T | null, AppError>>;
  exists(id: ID): Promise<Result<boolean, AppError>>;
  create(data: Partial<T>): Promise<Result<T, AppError>>;
  update(id: ID, data: Partial<T>): Promise<Result<T, AppError>>;
  delete(id: ID): Promise<Result<void, AppError>>;
  softDelete(id: ID): Promise<Result<void, AppError>>;
  restore(id: ID): Promise<Result<void, AppError>>;
}
