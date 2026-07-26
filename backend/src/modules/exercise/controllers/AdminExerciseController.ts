import { Request, Response, NextFunction } from 'express';
import { ExerciseService } from '../services/ExerciseService';
import { CreateExerciseSchema, UpdateExerciseSchema } from '../domain/ExerciseSchemas';
import { ValidationError } from '@errors/AppError';

export class AdminExerciseController {
  constructor(private readonly service: ExerciseService) {}

  public createExercise = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateExerciseSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid exercise data', parsed.error.format());
      }
      
      const result = await this.service.adminCreateExercise(parsed.data);
      if (result.isFailure()) throw result.error;
      return res.status(201).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public updateExercise = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = UpdateExerciseSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid exercise data', parsed.error.format());
      }
      
      const result = await this.service.adminUpdateExercise(req.params.id, parsed.data);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public deleteExercise = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.adminDeleteExercise(req.params.id);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}
