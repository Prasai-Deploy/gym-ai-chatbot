import { SubscriptionTier, BillingInterval } from '../domain/BillingSchemas';

export interface CheckoutSessionResult {
  provider: 'razorpay' | 'stripe';
  subscriptionId: string;
  orderId?: string;
  keyId: string;
  amount: number;
  currency: string;
}

export interface PaymentVerificationResult {
  valid: boolean;
  subscriptionId: string;
  paymentId: string;
}

export interface IPaymentProvider {
  createSubscription(userId: string, tier: SubscriptionTier, interval: BillingInterval): Promise<CheckoutSessionResult>;
  verifyPaymentSignature(paymentId: string, subscriptionId: string, signature: string): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean): Promise<boolean>;
}
