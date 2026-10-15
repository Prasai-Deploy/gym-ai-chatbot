import { z } from 'zod';

export const SubscriptionTierEnum = z.enum(['free', 'pro', 'elite']);
export type SubscriptionTier = z.infer<typeof SubscriptionTierEnum>;

export const BillingIntervalEnum = z.enum(['monthly', 'yearly']);
export type BillingInterval = z.infer<typeof BillingIntervalEnum>;

export const SubscriptionStatusEnum = z.enum(['active', 'past_due', 'canceled', 'trialing', 'incomplete']);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>;

export interface Subscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  interval: BillingInterval;
  status: SubscriptionStatus;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  provider?: string;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  razorpay_customer_id?: string | null;
  razorpay_subscription_id?: string | null;
  razorpay_payment_id?: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  subscription_id?: string | null;
  stripe_invoice_id?: string | null;
  amount_paid: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  invoice_pdf?: string | null;
  paid_at?: string | null;
  created_at: string;
}

export interface FeatureUsage {
  id: string;
  user_id: string;
  feature_key: string;
  usage_count: number;
  reset_at: string;
  created_at: string;
  updated_at: string;
}

export const STRIVA_PRICING: Record<BillingInterval, number> = {
  monthly: 799,
  yearly: 6999,
};

export const PaidSubscriptionTierEnum = z.enum(['pro', 'elite']);
export type PaidSubscriptionTier = z.infer<typeof PaidSubscriptionTierEnum>;

export const CreateCheckoutDTO = z.object({
  tier: z.string().optional().default('pro'),
  interval: BillingIntervalEnum.default('monthly'),
  successUrl: z.string().optional(),
  cancelUrl: z.string().optional()
});
export type CreateCheckoutDTOType = z.infer<typeof CreateCheckoutDTO>;

export const VerifyRazorpayPaymentDTO = z.object({
  razorpay_payment_id: z.string().min(1, 'Missing razorpay_payment_id'),
  razorpay_subscription_id: z.string().min(1, 'Missing razorpay_subscription_id'),
  razorpay_signature: z.string().min(1, 'Missing razorpay_signature'),
  tier: PaidSubscriptionTierEnum.default('pro'),
  interval: BillingIntervalEnum.default('monthly')
});
export type VerifyRazorpayPaymentDTOType = z.infer<typeof VerifyRazorpayPaymentDTO>;

export const RazorpayWebhookPayloadSchema = z.object({
  entity: z.string().optional(),
  account_id: z.string().optional(),
  event: z.string().min(1, 'Missing webhook event name'),
  event_id: z.string().optional(),
  id: z.string().optional(),
  created_at: z.number().optional(),
  contains: z.array(z.string()).optional(),
  payload: z.record(z.any()).optional().default({}),
}).passthrough();
export type RazorpayWebhookPayload = z.infer<typeof RazorpayWebhookPayloadSchema>;

export const TIER_LIMITS: Record<SubscriptionTier, { ai_queries_daily: number; ai_plans_monthly: number; pt_assignment: boolean; history_days: number }> = {
  free: {
    ai_queries_daily: 5,
    ai_plans_monthly: 1,
    pt_assignment: false,
    history_days: 7
  },
  pro: {
    ai_queries_daily: 100,
    ai_plans_monthly: 10,
    pt_assignment: false,
    history_days: 365
  },
  elite: {
    ai_queries_daily: 99999, // Unlimited
    ai_plans_monthly: 99999, // Unlimited
    pt_assignment: true,
    history_days: 99999 // Unlimited
  }
};
