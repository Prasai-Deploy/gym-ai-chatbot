import { V2WorkoutSessionRepository, V2WorkoutSessionRecord } from '../repositories/V2WorkoutSessionRepository';
import { WorkoutPlanRepository, WorkoutPlanRecord } from '../repositories/WorkoutPlanRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, ValidationError, NotFoundError } from '@errors/AppError';
import { StateTransitionDTO, CompleteSetDTO, normalizeOptionalExerciseId } from '../domain/WorkoutSchemas';
import { eventBus } from '@shared/core/EventBus';

export class WorkoutExecutionService {
  constructor(
    private readonly sessionRepository: V2WorkoutSessionRepository,
    private readonly planRepository: WorkoutPlanRepository
  ) {}

  // -- PLANS --
  public async getUserPlans(userId: string): Promise<Result<WorkoutPlanRecord[], AppError>> {
    return this.planRepository.getPlansForUser(userId);
  }

  public async getPlanById(planId: string, userId: string): Promise<Result<WorkoutPlanRecord, AppError>> {
    const res = await this.planRepository.getPlanById(planId, userId);
    if (res.isFailure()) return res as Result<any, AppError>;
    if (!res.value) return fail(new NotFoundError('Workout plan not found'));
    return ok(res.value);
  }

  public async createPlan(userId: string, data: Partial<WorkoutPlanRecord>): Promise<Result<WorkoutPlanRecord, AppError>> {
    return this.planRepository.createPlan(userId, data);
  }

  public async updatePlan(planId: string, userId: string, data: Partial<WorkoutPlanRecord>): Promise<Result<WorkoutPlanRecord, AppError>> {
    return this.planRepository.updatePlan(planId, userId, data);
  }

  // -- SESSIONS --
  public async getTodayWorkout(userId: string): Promise<Result<{ activeSession: V2WorkoutSessionRecord | null; latestPlan: WorkoutPlanRecord | null }, AppError>> {
    const activeRes = await this.sessionRepository.getActiveSession(userId);
    const plansRes = await this.planRepository.getPlansForUser(userId);

    const activeSession = activeRes.isSuccess() ? activeRes.value : null;
    const latestPlan = (plansRes.isSuccess() && plansRes.value.length > 0) ? plansRes.value[0] : null;

    return ok({ activeSession, latestPlan });
  }

  public async startSession(userId: string, planId?: string, title?: string): Promise<Result<V2WorkoutSessionRecord, AppError>> {
    // Check if an active session already exists
    const activeRes = await this.sessionRepository.getActiveSession(userId);
    if (activeRes.isSuccess() && activeRes.value) {
      return ok(activeRes.value);
    }
    return this.sessionRepository.startSession(userId, planId, title);
  }

  public async getActiveSession(userId: string): Promise<Result<V2WorkoutSessionRecord | null, AppError>> {
    return this.sessionRepository.getActiveSession(userId);
  }

  public async getSession(sessionId: string): Promise<Result<any, AppError>> {
    const res = await this.sessionRepository.findById(sessionId);
    if (res.isFailure()) return res;
    if (!res.value) return fail(new NotFoundError('Session not found'));
    return ok(res.value);
  }

  public async transitionSessionState(
    sessionId: string, 
    userId: string, 
    dto: StateTransitionDTO
  ): Promise<Result<V2WorkoutSessionRecord, AppError>> {
    const sessionRes = await this.sessionRepository.findById(sessionId);
    if (sessionRes.isFailure()) return sessionRes as Result<any, AppError>;
    
    const session = sessionRes.value;
    if (!session) return fail(new NotFoundError('Session not found'));

    if (session.user_id !== userId) {
      return fail(new AppError('Forbidden: Access denied to another member session', 403));
    }

    if (session.state === 'completed' || session.state === 'abandoned' || session.state === 'cancelled') {
      return fail(new ValidationError('Cannot transition a closed session', {}));
    }

    const result = await this.sessionRepository.transitionState(sessionId, userId, dto.state, dto.notes);
    
    if (result.isSuccess()) {
      eventBus.publish(`Workout.${dto.state.toUpperCase()}`, {
        sessionId,
        userId,
        notes: dto.notes
      });
    }

    return result;
  }

  public async completeSession(sessionId: string, userId: string, notes?: string): Promise<Result<V2WorkoutSessionRecord, AppError>> {
    return this.transitionSessionState(sessionId, userId, { state: 'completed', notes });
  }

  public async completeSet(setId: string, userId: string, dto: CompleteSetDTO): Promise<Result<void, AppError>> {
    return this.sessionRepository.completeSet(setId, userId, dto);
  }

  public async logSet(sessionId: string, userId: string, data: { exercise_id?: string | null; weight_kg?: number; reps?: number; rpe?: number }): Promise<Result<any, AppError>> {
    const sessionRes = await this.sessionRepository.findById(sessionId);
    if (sessionRes.isFailure() || !sessionRes.value) return fail(new NotFoundError('Session not found'));
    if (sessionRes.value.user_id !== userId) return fail(new AppError('Forbidden', 403));

    if (sessionRes.value.state === 'completed' || sessionRes.value.state === 'abandoned' || sessionRes.value.state === 'cancelled') {
      return fail(new ValidationError('Cannot log sets for a closed workout session', { state: sessionRes.value.state }));
    }

    const normalizedExerciseId = normalizeOptionalExerciseId(data.exercise_id);
    return this.sessionRepository.createSet(sessionId, {
      ...data,
      exercise_id: normalizedExerciseId,
    });
  }

  public async getHistory(userId: string): Promise<Result<V2WorkoutSessionRecord[], AppError>> {
    return this.sessionRepository.getHistory(userId);
  }
}
