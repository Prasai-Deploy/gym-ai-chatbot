import { IRepository } from '@shared/database/interfaces/IRepository';
import { Result } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { Exercise, SearchExerciseQuery } from '../domain/ExerciseSchemas';

export interface IExerciseRepository extends IRepository<Exercise> {
  search(query: SearchExerciseQuery): Promise<Result<Exercise[], AppError>>;
  findCategories(): Promise<Result<any[], AppError>>;
  findMuscleGroups(): Promise<Result<any[], AppError>>;
  findEquipment(): Promise<Result<any[], AppError>>;
}
