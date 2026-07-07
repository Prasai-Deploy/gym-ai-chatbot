import { Request, Response, NextFunction } from 'express';
import { ExerciseService } from '../services/ExerciseService';
import { SearchExerciseQuerySchema } from '../domain/ExerciseSchemas';
import { ValidationError } from '@errors/AppError';

export class ExerciseController {
  constructor(private readonly service: ExerciseService) {}

  public getExercise = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getExercise(req.params.id);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public searchExercises = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = SearchExerciseQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Invalid search parameters', parsed.error.format());
      }
      
      const result = await this.service.searchExercises(parsed.data);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public getCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getCategories();
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public getMuscleGroups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getMuscleGroups();
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public getEquipment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getEquipment();
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };
}
