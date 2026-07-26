import { Request, Response, NextFunction } from 'express';
import { ProgressAnalyticsService } from '../services/ProgressAnalyticsService';
import { AchievementService } from '../services/AchievementService';

export class ProgressController {
  constructor(
    private readonly analyticsService: ProgressAnalyticsService,
    private readonly achievementService: AchievementService
  ) {}

  public getStatistics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.analyticsService.getStatistics(userId);
      
      if (result.isFailure()) throw result.error;
      
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public getAchievements = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.achievementService.getUserAchievements(userId);
      
      if (result.isFailure()) throw result.error;
      
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };
}
