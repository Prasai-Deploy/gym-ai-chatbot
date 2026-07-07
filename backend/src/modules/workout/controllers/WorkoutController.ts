import { Request, Response, NextFunction } from 'express';
import { WorkoutExecutionService } from '../services/WorkoutExecutionService';
import { StateTransitionSchema, CompleteSetSchema } from '../domain/WorkoutSchemas';
import { ValidationError } from '@errors/AppError';

export class WorkoutController {
  constructor(private readonly executionService: WorkoutExecutionService) {}

  public getSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.executionService.getSession(req.params.id);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public transitionState = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = StateTransitionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid state transition data', parsed.error.format());
      }
      
      const userId = (req as any).user.id;
      const result = await this.executionService.transitionSessionState(req.params.id, userId, parsed.data);
      if (result.isFailure()) throw result.error;
      
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public completeSet = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CompleteSetSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid set data', parsed.error.format());
      }
      
      const userId = (req as any).user.id;
      // We pass the set ID from the params
      const result = await this.executionService.completeSet(req.params.setId, userId, parsed.data);
      if (result.isFailure()) throw result.error;
      
      return res.status(200).json({ success: true, message: 'Set completed successfully' });
    } catch (err) {
      next(err);
    }
  };
}
