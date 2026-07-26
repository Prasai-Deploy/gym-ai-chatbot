import { Result } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { WorkoutSession, WorkoutState, CompleteSetDTO } from '../domain/WorkoutSchemas';

export interface IWorkoutSessionRepository {
  findById(id: string): Promise<Result<WorkoutSession | null, AppError>>;
  transitionState(
    sessionId: string,
    userId: string,
    newState: WorkoutState,
    notes?: string
  ): Promise<Result<WorkoutSession, AppError>>;
  completeSet(setId: string, userId: string, data: CompleteSetDTO): Promise<Result<void, AppError>>;
}