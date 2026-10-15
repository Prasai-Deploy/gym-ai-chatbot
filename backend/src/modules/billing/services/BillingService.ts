import { SubscriptionRepository } from '../repositories/SubscriptionRepository';
import {
  Subscription,
  Invoice,
  SubscriptionTier,
  BillingInterval,
  TIER_LIMITS,
  RazorpayWebhookPayloadSchema,
  PaidSubscriptionTier,
} from '../domain/BillingSchemas';
import { RazorpayProvider, RAZORPAY_PRICING, STRIVA_PRICING } from '../providers/RazorpayProvider';
import { CheckoutSessionResult } from '../providers/IPaymentProvider';
import { EntitlementService, EntitlementResult, UserIdentityContext } from './EntitlementService';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, ValidationError } from '@errors/AppError';
import { logger } from '@logger/index';

export class BillingService {
  private readonly razorpayProvider: RazorpayProvider;
  private readonly entitlementService: EntitlementService;

  constructor(
    private readonly repo: SubscriptionRepository,
    razorpayProvider?: RazorpayProvider,
    entitlementService?: EntitlementService
  ) {
    this.razorpayProvider = razorpayProvider || new RazorpayProvider();
    this.entitlementService = entitlementService || new EntitlementService(this.repo);
  }

  /**
   * Safe status endpoint for authenticated members.
   * Resolves authoritative entitlement and non-sensitive billing details without mutating the database.
   */
  public async getSubscriptionStatus(
    userId: string,
    userContext?: UserIdentityContext
  ): Promise<Result<{
    entitlement: EntitlementResult;
    subscription: Partial<Subscription>;
    limits: typeof TIER_LIMITS.free;
    state: string;
    hasAccess: boolean;
    daysRemaining: number;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    tier: string;
    status: string;
    cancelAtPeriodEnd: boolean;
  }, AppError>> {
    try {
      const context: UserIdentityContext = userContext || { id: userId, role: 'Member' };
      const entitlement = await this.entitlementService.getEntitlement(context);

      // 1. Sandbox isolation: Demo User bypasses real billing lookups
      if (context.email === 'demo@sweatfix.com' || context.role === 'Demo User') {
        return ok({
          entitlement,
          subscription: {
            tier: 'pro',
            interval: 'monthly',
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 365 * 86400000).toISOString(),
            cancel_at_period_end: false,
            trial_started_at: null,
            trial_ends_at: null,
          },
          limits: TIER_LIMITS.pro,
          state: 'DEMO',
          hasAccess: true,
          daysRemaining: 999,
          trialEndsAt: null,
          currentPeriodEnd: null,
          tier: 'pro',
          status: 'active',
          cancelAtPeriodEnd: false,
        });
      }

      const subRes = await this.repo.findSubscriptionByUserId(userId);
      const subscription = subRes && typeof subRes.isSuccess === 'function' && subRes.isSuccess() ? subRes.value : null;

      const tier = (subscription?.tier || entitlement.tier || 'free') as SubscriptionTier;
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

      const safeSubscription: Partial<Subscription> = subscription
        ? {
            tier: subscription.tier,
            interval: subscription.interval,
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
            trial_started_at: subscription.trial_started_at || null,
            trial_ends_at: subscription.trial_ends_at || null,
          }
        : {
            tier,
            interval: 'monthly',
            status: entitlement.state === 'TRIAL' ? 'trialing' : (entitlement.state === 'ACTIVE' ? 'active' : 'incomplete'),
            current_period_start: new Date().toISOString(),
            current_period_end: entitlement.currentPeriodEnd || new Date(Date.now() + 14 * 86400000).toISOString(),
            cancel_at_period_end: false,
            trial_started_at: null,
            trial_ends_at: entitlement.trialEndsAt || null,
          };

      return ok({
        entitlement,
        subscription: safeSubscription,
        limits,
        state: entitlement.state,
        hasAccess: entitlement.hasAccess,
        daysRemaining: entitlement.daysRemaining ?? 0,
        trialEndsAt: entitlement.trialEndsAt ?? safeSubscription.trial_ends_at ?? null,
        currentPeriodEnd: entitlement.currentPeriodEnd ?? safeSubscription.current_period_end ?? null,
        tier: safeSubscription.tier || 'free',
        status: safeSubscription.status || 'incomplete',
        cancelAtPeriodEnd: safeSubscription.cancel_at_period_end ?? false,
      });
    } catch (err: any) {
      logger.error({ err, userId }, '[BillingService] Exception retrieving subscription status');
      return fail(new AppError(err.message, 500));
    }
  }

  public async createCheckoutSession(
    userId: string,
    tier: SubscriptionTier,
    interval: BillingInterval = 'monthly',
    successUrl?: string,
    cancelUrl?: string
  ): Promise<Result<{ url: string; sessionId: string }, AppError>> {
    const fakeSessionId = `cs_test_${Date.now()}_${userId.slice(0, 8)}`;
    const redirectUrl = successUrl
      ? `${successUrl}?session_id=${fakeSessionId}&tier=${tier}&interval=${interval}`
      : `/checkout/success?session_id=${fakeSessionId}&tier=${tier}&interval=${interval}`;

    return ok({
      url: redirectUrl,
      sessionId: fakeSessionId,
    });
  }

  /**
   * Creates a Razorpay checkout subscription.
   * Rejects client-side attempts to purchase free tiers.
   * Protects sandbox demo users from creating real Razorpay checkout subscriptions.
   */
  public async createRazorpayCheckout(
    userId: string,
    tier: SubscriptionTier = 'pro',
    interval: BillingInterval = 'monthly',
    userContext?: { email?: string; role?: string }
  ): Promise<Result<CheckoutSessionResult, AppError>> {
    if (tier === 'free') {
      return fail(new ValidationError('Checkout is only available for paid subscription tiers (pro, elite)'));
    }

    if (
      userId === 'usr-demo-1' ||
      userContext?.email === 'demo@sweatfix.com' ||
      userContext?.role === 'Demo User'
    ) {
      return fail(new ValidationError('Demo users operate in sandbox mode and cannot create real Razorpay checkout sessions'));
    }

    try {
      const checkoutResult = await this.razorpayProvider.createSubscription(userId, tier, interval);
      return ok(checkoutResult);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  /**
   * Verifies Razorpay checkout completion using constant-time cryptographic HMAC verification.
   * Authoritatively activates subscription only upon valid signature.
   */
  public async verifyRazorpayPayment(
    userId: string,
    payload: {
      razorpay_payment_id: string;
      razorpay_subscription_id: string;
      razorpay_signature: string;
      tier: PaidSubscriptionTier;
      interval: BillingInterval;
    }
  ): Promise<Result<Subscription, AppError>> {
    const isValid = this.razorpayProvider.verifyPaymentSignature(
      payload.razorpay_payment_id,
      payload.razorpay_subscription_id,
      payload.razorpay_signature
    );

    if (!isValid) {
      logger.warn({ userId, paymentId: payload.razorpay_payment_id }, '[BillingService] Payment signature verification failed');
      return fail(new ValidationError('Invalid Razorpay payment signature'));
    }

    // Server-computed period dates (never trust client dates)
    const now = new Date();
    const currentPeriodStart = now.toISOString();
    const durationDays = payload.interval === 'yearly' ? 365 : 30;
    const currentPeriodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    // Idempotent audit entry for client-verified payments
    const eventId = `pay_verify_${payload.razorpay_payment_id}`;
    await this.repo.recordPaymentEvent(eventId, 'payment.verified', payload);

    // Authoritative state update
    const updateRes = await this.repo.upsertSubscription(userId, {
      tier: payload.tier,
      interval: payload.interval,
      status: 'active',
      provider: 'razorpay',
      razorpay_subscription_id: payload.razorpay_subscription_id,
      razorpay_payment_id: payload.razorpay_payment_id,
      stripe_subscription_id: payload.razorpay_subscription_id, // preserve legacy compat
      stripe_customer_id: `rzp_cust_${userId.slice(0, 8)}`,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: false,
      canceled_at: null,
    });

    if (updateRes.isFailure()) return updateRes;

    // Record invoice
    const amountInRupees = STRIVA_PRICING[payload.interval] || 799;
    await this.repo.createInvoice({
      user_id: userId,
      subscription_id: updateRes.value.id,
      stripe_invoice_id: payload.razorpay_payment_id,
      amount_paid: amountInRupees,
      currency: 'inr',
      status: 'paid',
      paid_at: currentPeriodStart,
    });

    logger.info({ userId, tier: payload.tier, interval: payload.interval }, '[BillingService] Razorpay payment verified and activated');
    return updateRes;
  }

  /**
   * Authoritative asynchronous synchronization for Razorpay webhooks.
   * Requires exact rawBody, validates HMAC signature, enforces idempotency, and updates billing records safely.
   */
  public async handleRazorpayWebhook(
    rawBody: string,
    signature: string,
    payload: any
  ): Promise<Result<{ processed: boolean; reason?: string }, AppError>> {
    if (!rawBody || typeof rawBody !== 'string') {
      return fail(new ValidationError('Missing raw request body for webhook signature verification'));
    }

    if (!signature) {
      return fail(new ValidationError('Missing Razorpay webhook signature'));
    }

    // 1. Cryptographic HMAC SHA256 Signature Verification (fails closed if secret missing or signature invalid)
    const isValidSig = this.razorpayProvider.verifyWebhookSignature(rawBody, signature);
    if (!isValidSig) {
      logger.warn({ signature }, '[BillingService] Webhook rejected: Invalid HMAC signature');
      return fail(new ValidationError('Invalid Razorpay webhook signature'));
    }

    // 3. Validate Webhook Event Schema
    const parsed = RazorpayWebhookPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      logger.warn({ error: parsed.error }, '[BillingService] Malformed Razorpay webhook payload structure');
      return fail(new ValidationError('Malformed Razorpay webhook payload'));
    }

    const eventData = parsed.data;
    const eventType = eventData.event;
    const subEntity = eventData.payload?.subscription?.entity;
    const payEntity = eventData.payload?.payment?.entity;

    const subId: string | undefined = subEntity?.id;
    const payId: string | undefined = payEntity?.id;

    // 4. Resolve Deterministic Event Identifier for Idempotency
    const eventId: string | undefined =
      eventData.event_id ||
      (eventData.id && typeof eventData.id === 'string' && eventData.id.startsWith('evt_') ? eventData.id : undefined) ||
      (payId ? `${eventType}_${payId}` : undefined) ||
      (subId ? `${eventType}_${subId}_${eventData.created_at || ''}` : undefined);

    if (!eventId) {
      logger.warn({ eventType }, '[BillingService] Webhook rejected: Unable to determine unique event identifier');
      return fail(new ValidationError('Unable to determine unique event identifier'));
    }

    // 5. Idempotency Check & Atomic Audit Store
    const eventRes = await this.repo.recordPaymentEvent(eventId, eventType, payload);
    if (eventRes.isFailure()) return fail(eventRes.error);
    if (!eventRes.value) {
      logger.info({ eventId, eventType }, '[BillingService] Idempotency hit: Webhook event already processed');
      return ok({ processed: false, reason: 'IDEMPOTENT_DUPLICATE' });
    }

    // 6. Resolve Target Member Identity
    let targetUserId: string | undefined =
      subEntity?.notes?.user_id ||
      payEntity?.notes?.user_id ||
      (payload as any).user_id;

    if (!targetUserId && subId) {
      const existingSub = await this.repo.findSubscriptionByRazorpaySubId(subId);
      if (existingSub.isSuccess() && existingSub.value) {
        targetUserId = existingSub.value.user_id;
      }
    }

    if (!targetUserId) {
      logger.warn({ eventId, eventType, subId, payId }, '[BillingService] Webhook received without resolvable user_id');
      return ok({ processed: false, reason: 'USER_NOT_FOUND' });
    }

    // 7. Process Supported Razorpay Event Types
    if (
      eventType === 'subscription.activated' ||
      eventType === 'subscription.charged' ||
      eventType === 'payment.captured'
    ) {
      const tier: SubscriptionTier = (subEntity?.notes?.tier as SubscriptionTier) || 'pro';
      const interval: BillingInterval = (subEntity?.notes?.interval as BillingInterval) || 'monthly';

      const periodStart = subEntity?.current_start
        ? new Date(subEntity.current_start * 1000).toISOString()
        : new Date().toISOString();
      const periodEnd = subEntity?.current_end
        ? new Date(subEntity.current_end * 1000).toISOString()
        : new Date(Date.now() + (interval === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString();

      const upsertRes = await this.repo.upsertSubscription(targetUserId, {
        tier,
        interval,
        status: 'active',
        provider: 'razorpay',
        razorpay_subscription_id: subId || undefined,
        razorpay_payment_id: payId || undefined,
        razorpay_customer_id: subEntity?.customer_id || undefined,
        stripe_subscription_id: subId || undefined, // legacy compat
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        canceled_at: null,
      });

      // Persist invoice
      if (payEntity && typeof payEntity.amount === 'number') {
        await this.repo.createInvoice({
          user_id: targetUserId,
          subscription_id: upsertRes.isSuccess() ? upsertRes.value.id : undefined,
          stripe_invoice_id: payId || undefined,
          amount_paid: payEntity.amount / 100, // paise to rupees
          currency: (payEntity.currency || 'inr').toLowerCase(),
          status: 'paid',
          paid_at: periodStart,
        });
      }

      logger.info({ userId: targetUserId, eventType, tier }, '[BillingService] Synchronized active subscription from Razorpay webhook');
    } else if (eventType === 'payment.failed') {
      await this.repo.upsertSubscription(targetUserId, {
        status: 'past_due',
      });
      logger.warn({ userId: targetUserId, eventType }, '[BillingService] Marked subscription past_due from Razorpay payment.failed');
    } else if (eventType === 'subscription.cancelled') {
      await this.repo.upsertSubscription(targetUserId, {
        status: 'canceled',
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
      });
      logger.info({ userId: targetUserId, eventType }, '[BillingService] Marked subscription canceled from Razorpay webhook');
    } else if (eventType === 'subscription.halted' || eventType === 'subscription.paused') {
      await this.repo.upsertSubscription(targetUserId, {
        status: 'past_due',
      });
      logger.warn({ userId: targetUserId, eventType }, '[BillingService] Marked subscription past_due from Razorpay subscription.halted');
    } else {
      logger.info({ eventType }, '[BillingService] Acknowledged unhandled webhook event type without state mutation');
      return ok({ processed: false, reason: `UNHANDLED_EVENT_${eventType}` });
    }

    return ok({ processed: true });
  }

  public async cancelSubscription(userId: string): Promise<Result<Subscription, AppError>> {
    const subRes = await this.repo.getByUserId(userId);
    if (subRes.isFailure()) return fail(subRes.error);

    const subscription = subRes.value;
    const subId = subscription.razorpay_subscription_id || subscription.stripe_subscription_id;

    if (subId && subId.startsWith('sub_')) {
      const razorpaySuccess = await this.razorpayProvider.cancelSubscription(subId, true);
      if (!razorpaySuccess) {
        logger.error({ userId, subId }, '[BillingService] Razorpay cancellation request failed');
        return fail(new AppError('Razorpay subscription cancellation API request failed', 500));
      }
    }

    return this.repo.upsertSubscription(userId, {
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
    });
  }

  public async getInvoices(userId: string): Promise<Result<Invoice[], AppError>> {
    return this.repo.getInvoices(userId);
  }

  public async checkFeatureUsage(userId: string, featureKey: string): Promise<Result<{ allowed: boolean; remaining: number }, AppError>> {
    const subRes = await this.repo.getByUserId(userId);
    if (subRes.isFailure()) return fail(subRes.error);

    const tier = subRes.value.tier;
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
    const limit = featureKey === 'ai_queries' ? limits.ai_queries_daily : limits.ai_plans_monthly;

    return this.repo.checkAndUpdateFeatureUsage(userId, featureKey, limit);
  }

  public async getAdminMetrics(): Promise<Result<any, AppError>> {
    return this.repo.getAdminRevenueMetrics();
  }
}
