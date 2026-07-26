import { httpClient } from './httpClient';

export interface SubscriptionStatusResponse {
  subscription: {
    id: string;
    user_id: string;
    tier: 'free' | 'pro' | 'elite';
    interval: 'monthly' | 'yearly';
    status: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  };
  limits: {
    ai_queries_daily: number;
    ai_plans_monthly: number;
    pt_assignment: boolean;
    history_days: number;
  };
}

export interface InvoiceItem {
  id: string;
  amount_paid: number;
  currency: string;
  status: string;
  invoice_pdf?: string;
  created_at: string;
}

export interface RazorpayCheckoutData {
  provider: 'razorpay';
  subscriptionId: string;
  orderId?: string;
  keyId: string;
  amount: number;
  currency: string;
}

export const billingApi = {
  getStatus: async (): Promise<SubscriptionStatusResponse> => {
    const res = await httpClient.get<any>('/billing/status');
    return res.data;
  },

  createCheckout: async (tier: 'free' | 'pro' | 'elite', interval: 'monthly' | 'yearly' = 'monthly'): Promise<{ url: string; sessionId: string }> => {
    const res = await httpClient.post<any>('/billing/checkout', { tier, interval });
    return res.data;
  },

  createRazorpayCheckout: async (tier: 'free' | 'pro' | 'elite', interval: 'monthly' | 'yearly' = 'monthly'): Promise<RazorpayCheckoutData> => {
    const res = await httpClient.post<any>('/billing/razorpay/checkout', { tier, interval });
    return res.data;
  },

  verifyRazorpayPayment: async (payload: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string; tier: string; interval: string }): Promise<any> => {
    const res = await httpClient.post<any>('/billing/razorpay/verify', payload);
    return res.data;
  },

  updateSubscription: async (tier: 'free' | 'pro' | 'elite', interval: 'monthly' | 'yearly'): Promise<any> => {
    const res = await httpClient.patch<any>('/billing/subscription', { tier, interval });
    return res.data;
  },

  cancelSubscription: async (): Promise<any> => {
    const res = await httpClient.delete<any>('/billing/subscription');
    return res.data;
  },

  getInvoices: async (): Promise<InvoiceItem[]> => {
    const res = await httpClient.get<any>('/billing/invoices');
    return res.data;
  },

  getAdminMetrics: async (): Promise<any> => {
    const res = await httpClient.get<any>('/billing/admin/metrics');
    return res.data;
  }
};
