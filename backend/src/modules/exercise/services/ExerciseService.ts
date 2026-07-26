import { IExerciseRepository } from '../repositories/IExerciseRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, NotFoundError } from '@errors/AppError';
import { 
  Exercise,
  CreateExerciseDTO,
  UpdateExerciseDTO,
  SearchExerciseQuery
} from '../domain/ExerciseSchemas';
import { logger } from '@logger/index';
import { randomUUID } from 'crypto';

export class ExerciseService {
  constructor(private readonly repository: IExerciseRepository) {}

  public async getExercise(id: string): Promise<Result<Exercise, AppError>> {
    const result = await this.repository.findById(id);
    if (result.isFailure()) return result as Result<any, AppError>;
    
    if (!result.value) return fail(new NotFoundError('Exercise not found'));
    
    return ok(result.value);
  }

  public async searchExercises(query: SearchExerciseQuery): Promise<Result<Exercise[], AppError>> {
    return this.repository.search(query);
  }

  public async getCategories(): Promise<Result<any[], AppError>> {
    return this.repository.findCategories();
  }

  public async getMuscleGroups(): Promise<Result<any[], AppError>> {
    return this.repository.findMuscleGroups();
  }

  public async getEquipment(): Promise<Result<any[], AppError>> {
    return this.repository.findEquipment();
  }

  public async adminCreateExercise(dto: CreateExerciseDTO): Promise<Result<Exercise, AppError>> {
    const payload = {
      ...dto,
      id: randomUUID(),
      // In a real application, tag_ids and equipment_ids require TransactionManager usage 
      // to insert into the junction tables. For this vertical slice, we'll insert the base object.
    };
    
    const result = await this.repository.create(payload as any);
    if (result.isFailure()) return result as Result<any, AppError>;
    
    logger.info({ exerciseId: payload.id }, 'Exercise created by Admin');
    return ok(result.value);
  }

  public async adminUpdateExercise(id: string, dto: UpdateExerciseDTO): Promise<Result<Exercise, AppError>> {
    const result = await this.repository.update(id, dto as any);
    if (result.isFailure()) return result as Result<any, AppError>;
    
    logger.info({ exerciseId: id }, 'Exercise updated by Admin');
    return ok(result.value);
  }

  public async adminDeleteExercise(id: string): Promise<Result<void, AppError>> {
    const result = await this.repository.delete(id);
    if (result.isFailure()) return result;
    
    logger.info({ exerciseId: id }, 'Exercise deleted by Admin');
    return ok(undefined);
  }
}
