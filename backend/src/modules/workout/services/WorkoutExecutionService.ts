import { WorkoutSessionRepository } from '../repositories/WorkoutSessionRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, ValidationError } from '@errors/AppError';
import { StateTransitionDTO, CompleteSetDTO, WorkoutSession } from '../domain/WorkoutSchemas';
import { eventBus } from '@shared/core/EventBus';

export class WorkoutExecutionService {
  constructor(private readonly repository: WorkoutSessionRepository) {}

  public async getSession(sessionId: string): Promise<Result<WorkoutSession | null, AppError>> {
    return this.repository.findById(sessionId);
  }

  public async transitionSessionState(
    sessionId: string, 
    userId: string, 
    dto: StateTransitionDTO
  ): Promise<Result<WorkoutSession, AppError>> {
    // Basic validation: ensure session exists before transition
    const sessionRes = await this.repository.findById(sessionId);
    if (sessionRes.isFailure()) return sessionRes as Result<any, AppError>;
    
    const session = sessionRes.value;
    if (!session) return fail(new ValidationError('Session not found', {}));

    if (session.user_id !== userId) {
      return fail(new AppError('Forbidden', 403));
    }

    if (session.state === 'completed' || session.state === 'abandoned' || session.state === 'cancelled') {
      return fail(new ValidationError('Cannot transition a closed session', {}));
    }

    const result = await this.repository.transitionState(sessionId, userId, dto.state, dto.notes);
    
    if (result.isSuccess()) {
      eventBus.publish(`Workout.${dto.state.toUpperCase()}`, {
        sessionId,
        userId,
        notes: dto.notes
      });
    }

    return result;
  }

  public async completeSet(setId: string, userId: string, dto: CompleteSetDTO): Promise<Result<void, AppError>> {
    return this.repository.completeSet(setId, userId, dto);
  }
}
