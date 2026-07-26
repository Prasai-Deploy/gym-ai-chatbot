import { SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { Subscription, Invoice, SubscriptionTier, BillingInterval, TIER_LIMITS } from '../domain/BillingSchemas';
import { RazorpayProvider } from '../providers/RazorpayProvider';
import { CheckoutSessionResult } from '../providers/IPaymentProvider';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, ValidationError } from '@errors/AppError';

export class BillingService {
  private readonly razorpayProvider: RazorpayProvider;

  constructor(private readonly repo: SubscriptionRepository) {
    this.razorpayProvider = new RazorpayProvider();
  }

  public async getSubscriptionStatus(userId: string): Promise<Result<{ subscription: Subscription; limits: typeof TIER_LIMITS.free }, AppError>> {
    const subRes = await this.repo.getByUserId(userId);
    if (subRes.isFailure()) return fail(subRes.error);

    const subscription = subRes.value;
    const limits = TIER_LIMITS[subscription.tier] || TIER_LIMITS.free;

    return ok({ subscription, limits });
  }

  public async createCheckoutSession(userId: string, tier: SubscriptionTier, interval: BillingInterval = 'monthly', successUrl?: string, cancelUrl?: string): Promise<Result<{ url: string; sessionId: string }, AppError>> {
    const fakeSessionId = `cs_test_${Date.now()}_${userId.slice(0, 8)}`;
    const redirectUrl = successUrl 
      ? `${successUrl}?session_id=${fakeSessionId}&tier=${tier}&interval=${interval}`
      : `/checkout/success?session_id=${fakeSessionId}&tier=${tier}&interval=${interval}`;

    return ok({
      url: redirectUrl,
      sessionId: fakeSessionId
    });
  }

  public async createRazorpayCheckout(userId: string, tier: SubscriptionTier, interval: BillingInterval = 'monthly'): Promise<Result<CheckoutSessionResult, AppError>> {
    try {
      const checkoutResult = await this.razorpayProvider.createSubscription(userId, tier, interval);
      return ok(checkoutResult);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async verifyRazorpayPayment(userId: string, payload: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string; tier: SubscriptionTier; interval: BillingInterval }): Promise<Result<Subscription, AppError>> {
    const isValid = this.razorpayProvider.verifyPaymentSignature(
      payload.razorpay_payment_id,
      payload.razorpay_subscription_id,
      payload.razorpay_signature
    );

    if (!isValid) {
      return fail(new ValidationError('Invalid Razorpay payment signature'));
    }

    // Activate subscription in database upon verified payment
    const updateRes = await this.repo.upsertSubscription(userId, {
      tier: payload.tier,
      interval: payload.interval,
      status: 'active',
      stripe_subscription_id: payload.razorpay_subscription_id,
      stripe_customer_id: `rzp_cust_${userId.slice(0, 8)}`,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + (payload.interval === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: false
    });

    return updateRes;
  }

  public async handleRazorpayWebhook(rawBody: string, signature: string, payload: any): Promise<Result<{ processed: boolean }, AppError>> {
    // 1. Verify HMAC SHA256 Webhook Signature
    const isValidSig = this.razorpayProvider.verifyWebhookSignature(rawBody, signature);
    if (!isValidSig) {
      return fail(new ValidationError('Invalid Razorpay webhook signature'));
    }

    const eventId = payload.event_id || payload.payload?.payment?.entity?.id || `evt_rzp_${Date.now()}`;
    const eventType = payload.event || 'payment.captured';

    // 2. Idempotency Store Verification
    const eventRes = await this.repo.recordPaymentEvent(eventId, eventType, payload);
    if (eventRes.isFailure()) return fail(eventRes.error);
    if (!eventRes.value) {
      // Event already processed cleanly
      return ok({ processed: false });
    }

    // 3. Process Razorpay Event Type
    const entity = payload.payload?.subscription?.entity || payload.payload?.payment?.entity || payload;
    const userId = entity.notes?.user_id || payload.user_id;

    if (userId) {
      if (eventType === 'subscription.activated' || eventType === 'subscription.charged' || eventType === 'payment.captured') {
        const tier: SubscriptionTier = entity.notes?.tier || 'pro';
        const interval: BillingInterval = entity.notes?.interval || 'monthly';

        await this.repo.upsertSubscription(userId, {
          tier,
          interval,
          status: 'active',
          stripe_subscription_id: entity.id || entity.subscription_id,
          stripe_customer_id: entity.customer_id || `rzp_cust_${userId.slice(0, 8)}`,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + (interval === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false
        });
      } else if (eventType === 'payment.failed') {
        await this.repo.upsertSubscription(userId, { status: 'past_due' });
      } else if (eventType === 'subscription.cancelled') {
        await this.repo.upsertSubscription(userId, { status: 'canceled', tier: 'free' });
      }
    }

    return ok({ processed: true });
  }

  public async handleWebhook(eventId: string, eventType: string, payload: any): Promise<Result<{ processed: boolean }, AppError>> {
    const eventRes = await this.repo.recordPaymentEvent(eventId, eventType, payload);
    if (eventRes.isFailure()) return fail(eventRes.error);
    if (!eventRes.value) {
      return ok({ processed: false });
    }

    const userId = payload.user_id || payload.customer_metadata?.user_id;
    if (userId) {
      if (eventType === 'checkout.session.completed' || eventType === 'invoice.payment_succeeded') {
        const tier: SubscriptionTier = payload.tier || 'pro';
        const interval: BillingInterval = payload.interval || 'monthly';

        await this.repo.upsertSubscription(userId, {
          tier,
          interval,
          status: 'active',
          stripe_customer_id: payload.customer_id || `cus_${userId.slice(0, 8)}`,
          stripe_subscription_id: payload.subscription_id || `sub_${userId.slice(0, 8)}`,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + (interval === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false
        });
      } else if (eventType === 'invoice.payment_failed') {
        await this.repo.upsertSubscription(userId, { status: 'past_due' });
      } else if (eventType === 'customer.subscription.deleted') {
        await this.repo.upsertSubscription(userId, { status: 'canceled', tier: 'free' });
      }
    }

    return ok({ processed: true });
  }

  public async updateSubscription(userId: string, tier: SubscriptionTier, interval: BillingInterval): Promise<Result<Subscription, AppError>> {
    return this.repo.upsertSubscription(userId, {
      tier,
      interval,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + (interval === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  public async cancelSubscription(userId: string): Promise<Result<Subscription, AppError>> {
    return this.repo.upsertSubscription(userId, {
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString()
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
