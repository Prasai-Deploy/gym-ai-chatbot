import { Request, Response, NextFunction } from 'express';
import { AuthError, AppError } from '@errors/AppError';
import { supabase } from '@database/supabase';
import { SubscriptionRepository } from '../modules/billing/repositories/SubscriptionRepository';
import { SubscriptionTier, TIER_LIMITS } from '../modules/billing/domain/BillingSchemas';

const subRepo = new SubscriptionRepository(supabase);

const TIER_WEIGHT: Record<SubscriptionTier, number> = {
  free: 1,
  pro: 2,
  elite: 3
};

export const requireSubscription = (minTier: SubscriptionTier) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user) throw new AuthError('Unauthorized access');

      const subRes = await subRepo.getByUserId(user.id);
      if (subRes.isFailure()) throw subRes.error;

      const userTier = subRes.value.tier;
      if (TIER_WEIGHT[userTier] < TIER_WEIGHT[minTier]) {
        return res.status(403).json({
          success: false,
          error: {
            message: `Feature requires ${minTier.toUpperCase()} subscription tier or higher.`,
            code: 'TIER_UPGRADE_REQUIRED',
            currentTier: userTier,
            requiredTier: minTier
          }
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

export const checkFeatureLimit = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user) throw new AuthError('Unauthorized access');

      const subRes = await subRepo.getByUserId(user.id);
      if (subRes.isFailure()) throw subRes.error;

      const tier = subRes.value.tier;
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      const limit = featureKey === 'ai_queries' ? limits.ai_queries_daily : limits.ai_plans_monthly;

      const usageRes = await subRepo.checkAndUpdateFeatureUsage(user.id, featureKey, limit);
      if (usageRes.isFailure()) throw usageRes.error;

      if (!usageRes.value.allowed) {
        return res.status(429).json({
          success: false,
          error: {
            message: `You have reached your ${featureKey} limit for your current ${tier.toUpperCase()} tier. Please upgrade to unlock higher limits.`,
            code: 'FEATURE_LIMIT_EXCEEDED',
            tier,
            featureKey,
            limit
          }
        });
      }

      // Attach remaining count to request headers for client visibility
      res.setHeader('X-Feature-Limit-Remaining', usageRes.value.remaining.toString());
      next();
    } catch (err) {
      next(err);
    }
  };
};
