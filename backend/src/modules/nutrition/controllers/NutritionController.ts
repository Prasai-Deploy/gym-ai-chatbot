import { Request, Response, NextFunction } from 'express';
import { NutritionService } from '../services/NutritionService';
import { CreateNutritionLogSchema, UpdateNutritionLogSchema, AddWaterLogSchema } from '../domain/NutritionSchemas';
import { ValidationError } from '@errors/AppError';

export class NutritionController {
  constructor(private readonly service: NutritionService) {}

  public getDaily = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const dateStr = req.query.date as string | undefined;
      const result = await this.service.getDailySummary(userId, dateStr);

      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public createMeal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const parsed = CreateNutritionLogSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid nutrition log data', parsed.error.format());
      }

      const result = await this.service.createMealLog(userId, parsed.data);
      if (result.isFailure()) throw result.error;
      return res.status(201).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public updateMeal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const parsed = UpdateNutritionLogSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid nutrition update data', parsed.error.format());
      }

      const result = await this.service.updateMealLog(req.params.id, userId, parsed.data);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public deleteMeal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.service.deleteMealLog(req.params.id, userId);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, message: 'Meal log deleted successfully' });
    } catch (err) {
      next(err);
    }
  };

  public getWater = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const dateStr = req.query.date as string | undefined;
      const result = await this.service.getWaterLogs(userId, dateStr);

      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public addWater = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const parsed = AddWaterLogSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid water log data', parsed.error.format());
      }

      const result = await this.service.addWaterLog(userId, parsed.data);
      if (result.isFailure()) throw result.error;
      return res.status(201).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public deleteWater = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.service.deleteWaterLog(req.params.id, userId);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, message: 'Water log deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}
