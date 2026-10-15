import { SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { Subscription } from '../domain/BillingSchemas';
import { logger } from '@logger/index';

export type EntitlementState =
  | 'DEMO'
  | 'TRIAL'
  | 'ACTIVE'
  | 'GRACE_PERIOD'
  | 'EXPIRED'
  | 'CANCELLED';

export interface EntitlementResult {
  state: EntitlementState;
  hasAccess: boolean;
  daysRemaining?: number;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  reason: string;
  tier?: string;
  isDemo?: boolean;
}

export interface UserIdentityContext {
  id: string;
  email?: string;
  role?: string;
}

/**
 * STRIVA V2 — Central Server-Side Entitlement Engine
 * Evaluates persisted billing facts into application-level entitlement states.
 * Strictly read-only: never mutates database records, never creates subscriptions or extends trials.
 */
export class EntitlementService {
  constructor(private readonly repo: SubscriptionRepository) {}

  /**
   * Authoritatively evaluates access for an authenticated user.
   * Derives decision strictly from req.user identity, never from client body or headers.
   */
  public async getEntitlement(
    user: UserIdentityContext,
    now: Date = new Date()
  ): Promise<EntitlementResult> {
    if (!user || !user.id || typeof user.id !== 'string' || user.id.trim() === '') {
      return {
        state: 'EXPIRED',
        hasAccess: false,
        daysRemaining: 0,
        reason: 'UNAUTHENTICATED_USER_IDENTITY',
      };
    }

    // 1. Sandbox isolation: Demo User bypasses real billing lookups
    if (user.email === 'demo@sweatfix.com' || user.role === 'Demo User') {
      return this.evaluateSubscription(null, user, now);
    }

    // 2. Platform Super Admin and Organization Owner bypass member entitlement checks
    if (user.role === 'Platform Super Admin' || user.role === 'Organization Owner') {
      return this.evaluateSubscription(null, user, now);
    }

    // 3. Look up canonical subscription record using read-only repository query
    try {
      const subRes = await this.repo.findSubscriptionByUserId(user.id);
      if (subRes.isFailure()) {
        logger.error({ err: subRes.error, userId: user.id }, '[EntitlementService] Subscription lookup failed');
        // Fail closed on database error
        return {
          state: 'EXPIRED',
          hasAccess: false,
          daysRemaining: 0,
          reason: 'DATABASE_LOOKUP_FAILURE',
        };
      }

      return this.evaluateSubscription(subRes.value, user, now);
    } catch (err: any) {
      logger.error({ err, userId: user.id }, '[EntitlementService] Exception during subscription lookup');
      // Fail closed
      return {
        state: 'EXPIRED',
        hasAccess: false,
        daysRemaining: 0,
        reason: 'INTERNAL_LOOKUP_EXCEPTION',
      };
    }
  }

  /**
   * Pure evaluation function mapping persisted subscription state to application entitlement state.
   */
  public evaluateSubscription(
    sub: Subscription | null,
    user: UserIdentityContext,
    now: Date = new Date()
  ): EntitlementResult {
    // 1. Demo User: Sandbox access
    if (user.email === 'demo@sweatfix.com' || user.role === 'Demo User') {
      return {
        state: 'DEMO',
        hasAccess: true,
        isDemo: true,
        reason: 'DEMO_SANDBOX_ACCESS',
      };
    }

    // 2. Administrative Role Access
    if (user.role === 'Platform Super Admin' || user.role === 'Organization Owner') {
      return {
        state: 'ACTIVE',
        hasAccess: true,
        reason: 'ADMINISTRATIVE_ROLE_ACCESS',
      };
    }

    // 3. No Subscription Record: Fail closed
    if (!sub) {
      return {
        state: 'EXPIRED',
        hasAccess: false,
        daysRemaining: 0,
        reason: 'NO_SUBSCRIPTION_RECORD',
      };
    }

    const nowMs = now.getTime();

    // 4. Trial Logic: Status is 'trialing'
    if (sub.status === 'trialing') {
      if (!sub.trial_ends_at) {
        return {
          state: 'EXPIRED',
          hasAccess: false,
          daysRemaining: 0,
          tier: sub.tier,
          reason: 'MALFORMED_TRIAL_DATES',
        };
      }

      const trialEnd = new Date(sub.trial_ends_at);
      const trialEndMs = trialEnd.getTime();

      if (nowMs < trialEndMs) {
        const daysRemaining = Math.max(0, Math.ceil((trialEndMs - nowMs) / (1000 * 60 * 60 * 24)));
        return {
          state: 'TRIAL',
          hasAccess: true,
          daysRemaining,
          trialEndsAt: sub.trial_ends_at,
          currentPeriodEnd: sub.current_period_end,
          tier: sub.tier,
          reason: 'ACTIVE_14_DAY_TRIAL',
        };
      }

      // Trial has expired — Even if tier is 'pro', access is revoked!
      return {
        state: 'EXPIRED',
        hasAccess: false,
        daysRemaining: 0,
        trialEndsAt: sub.trial_ends_at,
        currentPeriodEnd: sub.current_period_end,
        tier: sub.tier,
        reason: 'TRIAL_PERIOD_EXPIRED',
      };
    }

    // 5. Active Paid Subscription Logic: Status is 'active'
    if (sub.status === 'active') {
      if (!sub.current_period_end) {
        return {
          state: 'EXPIRED',
          hasAccess: false,
          daysRemaining: 0,
          tier: sub.tier,
          reason: 'MISSING_PERIOD_END_DATE',
        };
      }

      const periodEnd = new Date(sub.current_period_end);
      const periodEndMs = periodEnd.getTime();

      if (nowMs < periodEndMs) {
        const daysRemaining = Math.max(0, Math.ceil((periodEndMs - nowMs) / (1000 * 60 * 60 * 24)));

        // If scheduled to cancel at period end, user retains paid access until period concludes
        if (sub.cancel_at_period_end === true) {
          return {
            state: 'CANCELLED',
            hasAccess: true,
            daysRemaining,
            currentPeriodEnd: sub.current_period_end,
            tier: sub.tier,
            reason: 'CANCELLED_ACTIVE_GRACE_UNTIL_PERIOD_END',
          };
        }

        return {
          state: 'ACTIVE',
          hasAccess: true,
          daysRemaining,
          currentPeriodEnd: sub.current_period_end,
          tier: sub.tier,
          reason: 'ACTIVE_PAID_SUBSCRIPTION',
        };
      }

      // Active paid cycle has ended and renewal has not been captured
      return {
        state: 'EXPIRED',
        hasAccess: false,
        daysRemaining: 0,
        currentPeriodEnd: sub.current_period_end,
        tier: sub.tier,
        reason: 'PAID_PERIOD_EXPIRED',
      };
    }

    // 6. Payment Failure / Grace Period Logic: Status is 'past_due'
    // Conservative Grace Period: 3 calendar days (72h) following current_period_end
    if (sub.status === 'past_due') {
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : new Date(nowMs - 1);
      const graceEnd = new Date(periodEnd.getTime() + 3 * 24 * 60 * 60 * 1000);
      const graceEndMs = graceEnd.getTime();

      if (nowMs <= graceEndMs) {
        const daysRemaining = Math.max(0, Math.ceil((graceEndMs - nowMs) / (1000 * 60 * 60 * 24)));
        return {
          state: 'GRACE_PERIOD',
          hasAccess: true,
          daysRemaining,
          currentPeriodEnd: sub.current_period_end,
          tier: sub.tier,
          reason: 'PAYMENT_FAILED_IN_GRACE_PERIOD',
        };
      }

      return {
        state: 'EXPIRED',
        hasAccess: false,
        daysRemaining: 0,
        currentPeriodEnd: sub.current_period_end,
        tier: sub.tier,
        reason: 'GRACE_PERIOD_EXPIRED',
      };
    }

    // 7. Cancelled Subscription: Status is 'canceled'
    if (sub.status === 'canceled') {
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
      if (periodEnd && nowMs < periodEnd.getTime()) {
        const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - nowMs) / (1000 * 60 * 60 * 24)));
        return {
          state: 'CANCELLED',
          hasAccess: true,
          daysRemaining,
          currentPeriodEnd: sub.current_period_end,
          tier: sub.tier,
          reason: 'CANCELLED_ACTIVE_GRACE_UNTIL_PERIOD_END',
        };
      }

      return {
        state: 'CANCELLED',
        hasAccess: false,
        daysRemaining: 0,
        currentPeriodEnd: sub.current_period_end,
        tier: sub.tier,
        reason: 'CANCELLATION_FINAL_PERIOD_ENDED',
      };
    }

    // 8. Fallback / Unentitled status ('incomplete', legacy 'free' without active trial, etc.)
    return {
      state: 'EXPIRED',
      hasAccess: false,
      daysRemaining: 0,
      tier: sub.tier,
      reason: `UNENTITLED_STATUS_${sub.status.toUpperCase()}`,
    };
  }
}
