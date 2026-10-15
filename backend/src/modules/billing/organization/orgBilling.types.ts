export type OrgSubscriptionStatus =
  | 'none'
  | 'pending_checkout'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'cancelled'
  | 'expired';

export type OrgBillingInterval = 'monthly' | 'yearly';

export type OrgInvoiceStatus = 'unpaid' | 'paid' | 'void' | 'failed';

export type OrgInvoiceType = 'receipt' | 'tax_invoice';

export type OrgPaymentEventStatus = 'pending' | 'processed' | 'ignored' | 'failed';

export interface OrgBillingAccount {
  id: string;
  organization_id: string;
  billing_name?: string | null;
  billing_email?: string | null;
  tax_id?: string | null; // GSTIN
  billing_address?: Record<string, any>;
  currency: string;
  status: 'pending_setup' | 'active' | 'delinquent';
  tax_status: 'unconfigured' | 'verified' | 'exempt';
  created_at: string;
  updated_at: string;
}

export interface OrgSubscriptionPlan {
  id: string;
  plan_code: string;
  name: string;
  description?: string | null;
  interval: OrgBillingInterval;
  amount_paise: number | null; // integer paise, null if unconfigured
  currency: string;
  is_configured: boolean;
  is_active: boolean;
  max_locations: number;
  max_staff: number;
  max_members: number;
  features: Record<string, any>;
  razorpay_plan_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgSubscription {
  id: string;
  organization_id: string;
  plan_id?: string | null;
  plan?: OrgSubscriptionPlan | null;
  status: OrgSubscriptionStatus;
  billing_interval: OrgBillingInterval;
  currency: string;
  amount_paise: number;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  cancelled_at?: string | null;
  grace_period_ends_at?: string | null;
  razorpay_customer_id?: string | null;
  razorpay_subscription_id?: string | null;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgInvoiceLineItem {
  description: string;
  quantity: number;
  unit_price_paise: number;
  amount_paise: number;
}

export interface OrgInvoice {
  id: string;
  organization_id: string;
  subscription_id?: string | null;
  invoice_number: string;
  amount_paise: number;
  subtotal_paise: number;
  discount_paise: number;
  tax_paise: number;
  tax_details: {
    configured: boolean;
    status: 'unconfigured' | 'verified' | 'exempt';
    cgst_paise?: number;
    sgst_paise?: number;
    igst_paise?: number;
    note?: string;
  };
  currency: string;
  status: OrgInvoiceStatus;
  type: OrgInvoiceType;
  line_items: OrgInvoiceLineItem[];
  razorpay_payment_id?: string | null;
  razorpay_order_id?: string | null;
  razorpay_invoice_id?: string | null;
  issued_at: string;
  paid_at?: string | null;
  due_at?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface OrgPaymentEvent {
  id: string;
  organization_id?: string | null;
  event_id: string;
  event_type: string;
  provider: string;
  payload: Record<string, any>;
  status: OrgPaymentEventStatus;
  error_message?: string | null;
  processed_at?: string | null;
  created_at: string;
}

export interface OrgCheckoutIntentResult {
  provider: 'razorpay';
  keyId: string;
  orderId?: string;
  subscriptionId?: string;
  amount_paise: number;
  currency: string;
  plan_code: string;
  plan_name: string;
}

export interface OrgFinancialSummary {
  organizationId: string;
  timeWindow: string;
  period: {
    from: string;
    to: string;
  };
  currency: string;
  totalCollectedPaise: number;
  totalCollectedFormatted: string;
  paidInvoicesCount: number;
  unpaidInvoicesCount: number;
  activePlanCode: string | null;
  subscriptionStatus: OrgSubscriptionStatus;
  pricingStatus: 'configured' | 'unconfigured';
  taxStatus: 'configured' | 'unconfigured';
  accountingNote: string;
}

/**
 * Valid state transitions for organization subscription state machine
 */
export const VALID_ORG_SUBSCRIPTION_TRANSITIONS: Record<OrgSubscriptionStatus, OrgSubscriptionStatus[]> = {
  none: ['pending_checkout', 'active'],
  pending_checkout: ['none', 'active', 'expired'],
  active: ['past_due', 'grace_period', 'cancelled', 'expired'],
  past_due: ['active', 'grace_period', 'cancelled', 'expired'],
  grace_period: ['active', 'cancelled', 'expired'],
  cancelled: ['pending_checkout', 'active', 'expired'],
  expired: ['pending_checkout', 'active', 'none'],
};
