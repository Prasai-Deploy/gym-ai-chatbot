import { httpClient } from './httpClient';

export type OrgSubscriptionStatus =
  | 'none'
  | 'pending_checkout'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'cancelled'
  | 'expired';

export interface OrgSubscriptionPlan {
  id: string;
  plan_code: string;
  name: string;
  description?: string | null;
  interval: 'monthly' | 'yearly';
  amount_paise: number | null;
  currency: string;
  is_configured: boolean;
  is_active: boolean;
  max_locations: number;
  max_staff: number;
  max_members: number;
  features: Record<string, any>;
  razorpay_plan_id?: string | null;
}

export interface OrgBillingAccount {
  id: string;
  organization_id: string;
  billing_name?: string | null;
  billing_email?: string | null;
  tax_id?: string | null;
  billing_address?: Record<string, any>;
  currency: string;
  status: 'pending_setup' | 'active' | 'delinquent';
  tax_status: 'unconfigured' | 'verified' | 'exempt';
}

export interface OrgSubscription {
  id: string;
  organization_id: string;
  plan_id?: string | null;
  plan?: OrgSubscriptionPlan | null;
  status: OrgSubscriptionStatus;
  billing_interval: 'monthly' | 'yearly';
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
}

export interface OrgInvoice {
  id: string;
  organization_id: string;
  invoice_number: string;
  amount_paise: number;
  subtotal_paise: number;
  discount_paise: number;
  tax_paise: number;
  tax_details: {
    configured: boolean;
    status: 'unconfigured' | 'verified' | 'exempt';
    note?: string;
  };
  currency: string;
  status: 'unpaid' | 'paid' | 'void' | 'failed';
  type: 'receipt' | 'tax_invoice';
  line_items: Array<{
    description: string;
    quantity: number;
    amount_paise: number;
  }>;
  razorpay_payment_id?: string | null;
  issued_at: string;
  paid_at?: string | null;
  notes?: string | null;
}

export interface OrgBillingStatusResponse {
  subscription: OrgSubscription | null;
  billingAccount: OrgBillingAccount | null;
  availablePlans: OrgSubscriptionPlan[];
  pricingStatus: 'configured' | 'unconfigured';
  taxStatus: 'configured' | 'unconfigured';
  hasActiveSubscription: boolean;
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

export interface CreateOrgCheckoutPayload {
  plan_code: string;
  interval?: 'monthly' | 'yearly';
}

export interface VerifyOrgPaymentPayload {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
  plan_code: string;
}

export const orgBillingApi = {
  /**
   * Retrieves organization billing status, active subscription, and plans.
   */
  getStatus: async (): Promise<OrgBillingStatusResponse> => {
    const res: any = await httpClient.get('/organizations/current/billing/status');
    return res.data;
  },

  /**
   * Lists available B2B subscription plans.
   */
  getPlans: async (): Promise<OrgSubscriptionPlan[]> => {
    const res: any = await httpClient.get('/organizations/current/billing/plans');
    return res.data;
  },

  /**
   * Retrieves organization billing account information.
   */
  getAccount: async (): Promise<OrgBillingAccount> => {
    const res: any = await httpClient.get('/organizations/current/billing/account');
    return res.data;
  },

  /**
   * Updates organization billing account details.
   */
  updateAccount: async (data: Partial<OrgBillingAccount>): Promise<OrgBillingAccount> => {
    const res: any = await httpClient.patch('/organizations/current/billing/account', data);
    return res.data;
  },

  /**
   * Creates a checkout intent/order for a gym software plan.
   */
  createCheckout: async (payload: CreateOrgCheckoutPayload): Promise<any> => {
    const res: any = await httpClient.post('/organizations/current/billing/checkout', payload);
    return res.data;
  },

  /**
   * Verifies Razorpay checkout payment signature.
   */
  verifyPayment: async (payload: VerifyOrgPaymentPayload): Promise<any> => {
    const res: any = await httpClient.post('/organizations/current/billing/verify', payload);
    return res.data;
  },

  /**
   * Schedules subscription cancellation at period end.
   */
  cancelSubscription: async (cancelAtPeriodEnd: boolean = true, reason?: string): Promise<OrgSubscription> => {
    const res: any = await httpClient.post('/organizations/current/billing/cancel', {
      cancel_at_period_end: cancelAtPeriodEnd,
      reason,
    });
    return res.data;
  },

  /**
   * Lists organization invoices and receipts.
   */
  getInvoices: async (params?: { status?: string; limit?: number; offset?: number }): Promise<{
    invoices: OrgInvoice[];
    total: number;
  }> => {
    const res: any = await httpClient.get('/organizations/current/billing/invoices', { params });
    return {
      invoices: res.data || [],
      total: res.meta?.total || 0,
    };
  },

  /**
   * Retrieves a specific organization invoice.
   */
  getInvoice: async (invoiceId: string): Promise<OrgInvoice> => {
    const res: any = await httpClient.get(`/organizations/current/billing/invoices/${invoiceId}`);
    return res.data;
  },

  /**
   * Retrieves organization cash collections & financial summary.
   */
  getFinancials: async (params?: { from?: string; to?: string }): Promise<OrgFinancialSummary> => {
    const res: any = await httpClient.get('/organizations/current/billing/financials', { params });
    return res.data;
  },
};
