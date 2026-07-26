import { Request, Response, NextFunction } from 'express';
import { WorkoutProgramService } from '../services/WorkoutProgramService';
import { CreateProgramSchema } from '../domain/WorkoutSchemas';
import { ValidationError } from '@errors/AppError';

export class AdminWorkoutController {
  constructor(private readonly programService: WorkoutProgramService) {}

  public createProgram = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateProgramSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid program data', parsed.error.format());
      }
      
      const userId = (req as any).user.id;
      const result = await this.programService.createProgram(parsed.data, userId);
      if (result.isFailure()) throw result.error;
      
      return res.status(201).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public publishVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { programId, versionId } = req.params;
      const result = await this.programService.publishProgramVersion(programId, versionId);
      if (result.isFailure()) throw result.error;
      
      return res.status(200).json({ success: true, message: 'Program version published' });
    } catch (err) {
      next(err);
    }
  };

  public getPublishedPrograms = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.programService.getPublishedPrograms();
      if (result.isFailure()) throw result.error;
      
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };
}
