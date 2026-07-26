import { Request, Response, NextFunction } from 'express';
import { ContextBuilderService } from '../services/ContextBuilderService';
import { RecommendationService } from '../services/RecommendationService';
import { NutritionService } from '../services/NutritionService';
import { RecoveryService } from '../services/RecoveryService';
import { MemoryService } from '../services/MemoryService';
import { LogNutritionSchema, LogRecoverySchema, SetMemorySchema } from '../domain/IntelligenceSchemas';
import { ValidationError } from '@errors/AppError';

export class IntelligenceController {
  constructor(
    private readonly contextBuilder: ContextBuilderService,
    private readonly recommendation: RecommendationService,
    private readonly nutrition: NutritionService,
    private readonly recovery: RecoveryService,
    private readonly memory: MemoryService
  ) {}

  public getContext = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.contextBuilder.buildUnifiedContext(userId);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public getRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const contextRes = await this.contextBuilder.buildUnifiedContext(userId);
      if (contextRes.isFailure()) throw contextRes.error;
      
      const recRes = await this.recommendation.generateRecommendations(contextRes.value);
      if (recRes.isFailure()) throw recRes.error;
      
      return res.status(200).json({ success: true, data: recRes.value });
    } catch (err) {
      next(err);
    }
  };

  public logNutrition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = LogNutritionSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid nutrition data', parsed.error.format());
      
      const userId = (req as any).user.id;
      const result = await this.nutrition.logNutrition(userId, parsed.data);
      if (result.isFailure()) throw result.error;
      return res.status(201).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public logRecovery = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = LogRecoverySchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid recovery data', parsed.error.format());
      
      const userId = (req as any).user.id;
      const result = await this.recovery.logRecovery(userId, parsed.data);
      if (result.isFailure()) throw result.error;
      return res.status(201).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public setMemory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = SetMemorySchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid memory data', parsed.error.format());
      
      const userId = (req as any).user.id;
      const result = await this.memory.setMemory(userId, parsed.data);
      if (result.isFailure()) throw result.error;
      return res.status(201).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };
}
