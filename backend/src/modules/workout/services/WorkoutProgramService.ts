import { WorkoutProgramRepository } from '../repositories/WorkoutProgramRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { CreateProgramDTO } from '../domain/WorkoutSchemas';

export class WorkoutProgramService {
  constructor(private readonly repository: WorkoutProgramRepository) {}

  public async createProgram(dto: CreateProgramDTO, authorId: string): Promise<Result<any, AppError>> {
    const payload = { ...dto, author_id: authorId };
    return this.repository.create(payload);
  }

  public async publishProgramVersion(programId: string, versionId: string): Promise<Result<void, AppError>> {
    return this.repository.publishVersion(programId, versionId);
  }

  public async getPublishedPrograms(): Promise<Result<any[], AppError>> {
    return this.repository.getPublishedPrograms();
  }
}
