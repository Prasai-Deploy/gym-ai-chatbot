import crypto from 'crypto';
import { IPaymentProvider, CheckoutSessionResult } from './IPaymentProvider';
import { SubscriptionTier, BillingInterval } from '../domain/BillingSchemas';
import { env } from '@config/env';
import { logger } from '@logger/index';

// INR Pricing Structure (Paise = Amount * 100)
const RAZORPAY_PRICING: Record<SubscriptionTier, Record<BillingInterval, number>> = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 1499, yearly: 14990 }, // ₹1,499/mo or ₹14,990/yr
  elite: { monthly: 3999, yearly: 39990 }, // ₹3,999/mo or ₹39,990/yr
};

export class RazorpayProvider implements IPaymentProvider {
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly baseUrl: string = 'https://api.razorpay.com/v1';

  constructor(keyId?: string, keySecret?: string, webhookSecret?: string) {
    this.keyId = keyId || env.RAZORPAY_KEY_ID || '';
    this.keySecret = keySecret || env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = webhookSecret || env.RAZORPAY_WEBHOOK_SECRET || '';
  }

  /**
   * Creates a real Razorpay subscription via server-side REST API.
   * Fails closed if credentials are missing or Razorpay API returns an error.
   */
  public async createSubscription(
    userId: string,
    tier: SubscriptionTier,
    interval: BillingInterval = 'monthly'
  ): Promise<CheckoutSessionResult> {
    if (!this.keyId || !this.keySecret) {
      logger.error('[RazorpayProvider] Missing Razorpay API credentials');
      throw new Error('Razorpay API credentials unconfigured in server environment');
    }

    const amountInRupees = RAZORPAY_PRICING[tier][interval];
    const amountInPaise = amountInRupees * 100;

    const authHeader = `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`;

    try {
      const response = await fetch(`${this.baseUrl}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          plan_id: process.env[`RAZORPAY_PLAN_${tier.toUpperCase()}_${interval.toUpperCase()}`] || `plan_${tier}_${interval}`,
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
        keyId: this.keyId,
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
    if (!signature || !paymentId || !subscriptionId || !this.keySecret) {
      return false;
    }

    try {
      const payload = `${paymentId}|${subscriptionId}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
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
    if (!signature || !rawBody || !this.webhookSecret) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
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
    if (!this.keyId || !this.keySecret || !subscriptionId) {
      logger.error('[RazorpayProvider] Cannot cancel subscription: missing credentials or subscriptionId');
      return false;
    }

    const authHeader = `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`;

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
