import { Request, Response, NextFunction } from 'express';
import { AuthError, SubscriptionRequiredError } from '@errors/AppError';
import { supabase } from '@database/supabase';
import { logger } from '@logger/index';
import {
  EntitlementService,
  EntitlementResult,
  UserIdentityContext,
} from '../modules/billing/services/EntitlementService';
import { SubscriptionRepository } from '../modules/billing/repositories/SubscriptionRepository';

declare global {
  namespace Express {
    interface Request {
      entitlement?: EntitlementResult;
    }
  }
}

const defaultSubscriptionRepo = new SubscriptionRepository(supabase);
const defaultEntitlementService = new EntitlementService(defaultSubscriptionRepo);

export interface EntitlementMiddlewareOptions {
  feature?: string;
}

/**
 * STRIVA V2 — Authoritative Server-Side Entitlement Middleware
 *
 * Enforces subscription access strictly derived from verified Supabase JWT (req.user.id).
 * Rejects client headers, query parameters, or request body identity overrides.
 * Returns HTTP 403 (SubscriptionRequiredError) for authenticated but unentitled members.
 */
export const requireActiveEntitlement = (
  options?: EntitlementMiddlewareOptions,
  service: EntitlementService = defaultEntitlementService
) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        throw new AuthError('Authentication required to evaluate entitlement');
      }

      // Extract verified role from JWT metadata or tenant context, defaulting to Member
      const userRole: string =
        user.user_metadata?.role ||
        user.app_metadata?.role ||
        req.organizationContext?.roleKey ||
        user.role ||
        'Member';

      const userContext: UserIdentityContext = {
        id: user.id,
        email: user.email,
        role: userRole,
      };

      const entitlement = await service.getEntitlement(userContext);

      // Attach authoritative decision to Request for downstream handlers/tools
      req.entitlement = entitlement;

      if (!entitlement.hasAccess) {
        logger.warn(
          {
            userId: user.id,
            feature: options?.feature,
            state: entitlement.state,
            reason: entitlement.reason,
          },
          '[EntitlementMiddleware] Access denied: Subscription or trial inactive'
        );

        throw new SubscriptionRequiredError(
          'An active STRIVA subscription is required to access this feature.',
          entitlement.state
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireEntitlement = requireActiveEntitlement;
