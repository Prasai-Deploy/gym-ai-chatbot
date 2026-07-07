import { IRepository } from '@shared/database/interfaces/IRepository';
import { Result } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { FitnessProfile, UserPreferences } from '../domain/IdentitySchemas';

export interface IIdentityRepository extends IRepository<any> {
  findByAuthId(authId: string): Promise<Result<any, AppError>>;
  findFitnessProfile(userId: string): Promise<Result<FitnessProfile | null, AppError>>;
  updateFitnessProfile(userId: string, data: Partial<FitnessProfile>): Promise<Result<FitnessProfile, AppError>>;
  
  findPreferences(userId: string): Promise<Result<UserPreferences | null, AppError>>;
  updatePreferences(userId: string, data: Partial<UserPreferences>): Promise<Result<UserPreferences, AppError>>;

  resetDemoData(userId: string): Promise<Result<void, AppError>>;
}
