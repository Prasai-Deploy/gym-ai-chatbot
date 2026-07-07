import { BaseTool } from '../BaseTool';
import { z } from 'zod';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';

export const LogWorkoutSchema = z.object({
  sessionId: z.string().uuid(),
  state: z.enum(['started', 'paused', 'completed', 'abandoned']),
  notes: z.string().optional()
});

// Since we are mocking the external domain services for this slice, we define an interface
interface IExternalWorkoutExecutionService {
  transitionSessionState(sessionId: string, userId: string, dto: any): Promise<Result<any, AppError>>;
}

export class LogWorkoutTool extends BaseTool<z.infer<typeof LogWorkoutSchema>, any> {
  public readonly name = 'logWorkout';
  public readonly description = 'Changes the state of a workout session (e.g. start, complete).';
  public readonly inputSchema = LogWorkoutSchema;

  constructor(private readonly workoutService: IExternalWorkoutExecutionService) {
    super();
  }

  protected async executeImpl(input: z.infer<typeof LogWorkoutSchema>, userId: string): Promise<Result<any, AppError>> {
    return this.workoutService.transitionSessionState(input.sessionId, userId, {
      state: input.state,
      notes: input.notes
    });
  }
}
