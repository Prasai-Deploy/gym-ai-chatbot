import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/AdminService';
import { AssignPlanSchema } from '../domain/AdminSchemas';
import { ValidationError } from '@errors/AppError';

export class AdminController {
  constructor(private readonly service: AdminService) {}

  public getDashboardData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getDashboardStats();
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public getMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      const search = req.query.search as string | undefined;

      const result = await this.service.getMembers({ limit, offset, search });
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public getMembershipPlans = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getMembershipPlans();
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public getPlans = async (req: Request, res: Response, next: NextFunction) => {
    // Alias for getMembershipPlans to satisfy the frontend adminApi.getPlans() call
    return this.getMembershipPlans(req, res, next);
  };

  public assignPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = AssignPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid assign plan data', parsed.error.format());
      }

      const result = await this.service.assignPlan(parsed.data);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, message: 'Plan assigned successfully' });
    } catch (err) {
      next(err);
    }
  };
}
