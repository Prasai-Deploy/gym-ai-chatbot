import { Request, Response, NextFunction } from 'express';
import { IdentityService } from '../services/IdentityService';
import { 
  UpdateProfileSchema, 
  UpdateFitnessProfileSchema, 
  UpdatePreferencesSchema 
} from '../domain/IdentitySchemas';
import { ValidationError } from '@errors/AppError';

export class IdentityController {
  constructor(private readonly service: IdentityService) {}

  public getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.service.getProfile(userId);
      
      if (result.isFailure()) throw result.error;
      
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const parsed = UpdateProfileSchema.safeParse(req.body);
      
      if (!parsed.success) {
        throw new ValidationError('Invalid profile data', parsed.error.format());
      }

      const result = await this.service.updateProfile(userId, parsed.data);
      if (result.isFailure()) throw result.error;

      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public getFitnessProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.service.getFitnessProfile(userId);
      
      if (result.isFailure()) throw result.error;
      
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public updateFitnessProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const parsed = UpdateFitnessProfileSchema.safeParse(req.body);
      
      if (!parsed.success) {
        throw new ValidationError('Invalid fitness profile data', parsed.error.format());
      }

      const result = await this.service.updateFitnessProfile(userId, parsed.data);
      if (result.isFailure()) throw result.error;

      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public getPreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.service.getPreferences(userId);
      
      if (result.isFailure()) throw result.error;
      
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public updatePreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const parsed = UpdatePreferencesSchema.safeParse(req.body);
      
      if (!parsed.success) {
        throw new ValidationError('Invalid preferences data', parsed.error.format());
      }

      const result = await this.service.updatePreferences(userId, parsed.data);
      if (result.isFailure()) throw result.error;

      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public resetDemoData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const email = (req as any).user.email;

      // STRICT SECURITY CHECK: Only allow resetting the official demo account
      if (email !== 'demo@sweatfix.com') {
        return res.status(403).json({ success: false, message: 'Forbidden. Only demo users can reset data.' });
      }

      const result = await this.service.resetDemoData(userId);
      if (result.isFailure()) throw result.error;

      return res.status(200).json({ success: true, message: 'Demo data reset successfully' });
    } catch (err) {
      next(err);
    }
  };
}
