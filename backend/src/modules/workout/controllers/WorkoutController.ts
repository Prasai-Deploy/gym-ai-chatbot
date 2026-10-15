import { Request, Response, NextFunction } from 'express';
import { WorkoutExecutionService } from '../services/WorkoutExecutionService';
import { StateTransitionSchema, CompleteSetSchema } from '../domain/WorkoutSchemas';
import { ValidationError, ForbiddenError } from '@errors/AppError';

export class WorkoutController {
  constructor(private readonly executionService: WorkoutExecutionService) {}

  // -- PLANS --
  public getPlans = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.executionService.getUserPlans(userId);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public getPlanById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.executionService.getPlanById(req.params.id, userId);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public createPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.executionService.createPlan(userId, req.body);
      if (result.isFailure()) throw result.error;
      return res.status(201).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public updatePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.executionService.updatePlan(req.params.id, userId, req.body);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  // -- SESSIONS --
  public getToday = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.executionService.getTodayWorkout(userId);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public startSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { planId, title } = req.body || {};
      const result = await this.executionService.startSession(userId, planId, title);
      if (result.isFailure()) throw result.error;
      return res.status(201).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public getActiveSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.executionService.getActiveSession(userId);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public getSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.executionService.getSession(req.params.id);
      if (result.isFailure()) throw result.error;

      // Privacy check
      if (result.value && result.value.user_id !== userId) {
        throw new ForbiddenError('Access denied: You cannot view another member workout session');
      }

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

  public completeSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { notes } = req.body || {};
      const result = await this.executionService.completeSession(req.params.id, userId, notes);
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
      const result = await this.executionService.completeSet(req.params.setId, userId, parsed.data);
      if (result.isFailure()) throw result.error;
      
      return res.status(200).json({ success: true, message: 'Set completed successfully' });
    } catch (err) {
      next(err);
    }
  };

  public logSet = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { sessionId, weight_kg, reps, rpe, exercise_id } = req.body;
      const targetSessionId = sessionId || req.params.sessionId;
      if (!targetSessionId) {
        throw new ValidationError('sessionId is required to log an exercise set');
      }
      const result = await this.executionService.logSet(targetSessionId, userId, { exercise_id, weight_kg, reps, rpe });
      if (result.isFailure()) throw result.error;
      return res.status(201).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.executionService.getHistory(userId);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };
}
