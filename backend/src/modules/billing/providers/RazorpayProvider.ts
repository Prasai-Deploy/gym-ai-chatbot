import crypto from 'crypto';
import { IPaymentProvider, CheckoutSessionResult } from './IPaymentProvider';
import { SubscriptionTier, BillingInterval } from '../domain/BillingSchemas';
import { env } from '@config/env';
import { logger } from '@logger/index';

// Canonical STRIVA Consumer Pricing Structure (Paise = Amount * 100)
export const STRIVA_PRICING: Record<BillingInterval, number> = {
  monthly: 799, // ₹799/month
  yearly: 6999, // ₹6,999/year (~₹583/mo, save ~27%)
};

// Legacy mapping for DB backwards compatibility
export const RAZORPAY_PRICING: Record<SubscriptionTier, Record<BillingInterval, number>> = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 799, yearly: 6999 },
  elite: { monthly: 799, yearly: 6999 }, // Single plan model: Pro and Elite resolve to canonical STRIVA pricing
};

export class RazorpayProvider implements IPaymentProvider {
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly baseUrl: string = 'https://api.razorpay.com/v1';

  constructor(keyId?: string, keySecret?: string, webhookSecret?: string) {
    this.keyId = keyId || '';
    this.keySecret = keySecret || '';
    this.webhookSecret = webhookSecret || '';
  }

  public getKeyId(): string {
    return this.keyId || env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '';
  }

  public getKeySecret(): string {
    return this.keySecret || env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '';
  }

  public getWebhookSecret(): string {
    return this.webhookSecret || env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET || '';
  }

  public hasWebhookSecret(): boolean {
    const sec = this.getWebhookSecret();
    return Boolean(sec && sec.trim() !== '');
  }

  /**
   * Creates a real Razorpay subscription via server-side REST API.
   * Fails closed if credentials are missing or Razorpay API returns an error.
   */
  public async createSubscription(
    userId: string,
    tier: SubscriptionTier = 'pro',
    interval: BillingInterval = 'monthly'
  ): Promise<CheckoutSessionResult> {
    const keyId = this.getKeyId();
    const keySecret = this.getKeySecret();
    if (!keyId || !keySecret) {
      logger.error('[RazorpayProvider] Missing Razorpay API credentials');
      throw new Error('Razorpay API credentials unconfigured in server environment');
    }

    // Canonical Server-Side Price Resolution: ₹799 monthly, ₹6,999 annual
    const amountInRupees = STRIVA_PRICING[interval] || 799;
    const amountInPaise = amountInRupees * 100;

    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

    const planId =
      process.env[`RAZORPAY_PLAN_STRIVA_${interval.toUpperCase()}`] ||
      process.env[`RAZORPAY_PLAN_${tier.toUpperCase()}_${interval.toUpperCase()}`] ||
      (interval === 'yearly' ? 'plan_striva_annual' : 'plan_striva_monthly');

    try {
      const response = await fetch(`${this.baseUrl}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          plan_id: planId,
          total_count: interval === 'yearly' ? 1 : 12,
          quantity: 1,
          customer_notify: 1,
          notes: {
            user_id: userId,
            tier,
            interval,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, errorText }, '[RazorpayProvider] Subscription creation failed');
        
        // If API fails or plan not found, throw error — NEVER return simulated fake subscription IDs
        throw new Error(`Razorpay API returned HTTP ${response.status}: ${errorText}`);
      }

      const data: any = await response.json();

      return {
        provider: 'razorpay',
        subscriptionId: data.id,
        orderId: data.order_id || `order_${data.id}`,
        keyId,
        amount: amountInPaise,
        currency: data.currency || 'INR',
      };
    } catch (err: any) {
      logger.error({ err }, '[RazorpayProvider] Network/API exception during subscription creation');
      throw new Error(`Failed to create Razorpay subscription: ${err.message}`);
    }
  }

  /**
   * Cryptographically verifies Razorpay checkout payment signature using HMAC SHA-256 constant-time comparison.
   * Signature payload: `${paymentId}|${subscriptionId}`
   */
  public verifyPaymentSignature(paymentId: string, subscriptionId: string, signature: string): boolean {
    const keySecret = this.getKeySecret();
    if (!signature || !paymentId || !subscriptionId || !keySecret) {
      return false;
    }

    try {
      const payload = `${paymentId}|${subscriptionId}`;
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(payload)
        .digest('hex');

      return this.constantTimeCompare(signature, expectedSignature);
    } catch {
      return false;
    }
  }

  /**
   * Cryptographically verifies Razorpay webhook signature using HMAC SHA-256 over raw request body.
   */
  public verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const webhookSecret = this.getWebhookSecret();
    if (!signature || !rawBody || !webhookSecret) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      return this.constantTimeCompare(signature, expectedSignature);
    } catch {
      return false;
    }
  }

  /**
   * Cancels a subscription via Razorpay REST API.
   * Fails closed if Razorpay API call fails or returns error.
   */
  public async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<boolean> {
    const keyId = this.getKeyId();
    const keySecret = this.getKeySecret();
    if (!keyId || !keySecret || !subscriptionId) {
      logger.error('[RazorpayProvider] Cannot cancel subscription: missing credentials or subscriptionId');
      return false;
    }

    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

    try {
      const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          cancel_at_cycle_end: cancelAtPeriodEnd ? 1 : 0,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, errorText, subscriptionId }, '[RazorpayProvider] Cancellation API error');
        return false;
      }

      const data: any = await response.json();
      logger.info({ subscriptionId, status: data.status }, '[RazorpayProvider] Subscription cancelled successfully');
      return true;
    } catch (err: any) {
      logger.error({ err, subscriptionId }, '[RazorpayProvider] Exception cancelling subscription');
      return false;
    }
  }

  /**
   * Helper function for constant-time string comparison to prevent timing attacks.
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');

    if (bufA.length !== bufB.length) return false;

    return crypto.timingSafeEqual(bufA, bufB);
  }
}
