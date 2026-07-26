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

export const CreateCheckoutDTO = z.object({
  tier: SubscriptionTierEnum,
  interval: BillingIntervalEnum.default('monthly'),
  successUrl: z.string().optional(),
  cancelUrl: z.string().optional()
});
export type CreateCheckoutDTOType = z.infer<typeof CreateCheckoutDTO>;

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
