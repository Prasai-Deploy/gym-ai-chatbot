import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '@database/supabase';
import {
  OrgBillingAccount,
  OrgSubscriptionPlan,
  OrgSubscription,
  OrgInvoice,
  OrgPaymentEvent,
  OrgInvoiceStatus,
  OrgSubscriptionStatus,
} from './orgBilling.types';
import { DatabaseError } from '@errors/AppError';

export class OrgBillingRepository {
  constructor(private readonly supabase: SupabaseClient = defaultSupabase) {}

  // 1. BILLING ACCOUNTS
  public async getBillingAccount(orgId: string): Promise<OrgBillingAccount | null> {
    const { data, error } = await this.supabase
      .from('organization_billing_accounts')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(`Failed to fetch organization billing account: ${error.message}`);
    }

    return data;
  }

  public async upsertBillingAccount(
    orgId: string,
    account: Partial<OrgBillingAccount>
  ): Promise<OrgBillingAccount> {
    const payload = {
      ...account,
      organization_id: orgId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('organization_billing_accounts')
      .upsert(payload, { onConflict: 'organization_id' })
      .select('*')
      .single();

    if (error) {
      throw new DatabaseError(`Failed to upsert organization billing account: ${error.message}`);
    }

    return data;
  }

  // 2. SUBSCRIPTION PLANS
  public async listPlans(): Promise<OrgSubscriptionPlan[]> {
    const { data, error } = await this.supabase
      .from('organization_subscription_plans')
      .select('*')
      .order('max_locations', { ascending: true });

    if (error) {
      throw new DatabaseError(`Failed to list organization subscription plans: ${error.message}`);
    }

    return data || [];
  }

  public async getPlanByCode(planCode: string): Promise<OrgSubscriptionPlan | null> {
    const { data, error } = await this.supabase
      .from('organization_subscription_plans')
      .select('*')
      .eq('plan_code', planCode)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(`Failed to fetch subscription plan '${planCode}': ${error.message}`);
    }

    return data;
  }

  public async getPlanById(planId: string): Promise<OrgSubscriptionPlan | null> {
    const { data, error } = await this.supabase
      .from('organization_subscription_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(`Failed to fetch subscription plan by ID '${planId}': ${error.message}`);
    }

    return data;
  }

  // 3. SUBSCRIPTIONS
  public async getSubscription(orgId: string): Promise<OrgSubscription | null> {
    const { data, error } = await this.supabase
      .from('organization_subscriptions')
      .select('*, plan:organization_subscription_plans(*)')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(`Failed to fetch organization subscription: ${error.message}`);
    }

    return data;
  }

  public async getSubscriptionByRazorpayId(razorpaySubId: string): Promise<OrgSubscription | null> {
    const { data, error } = await this.supabase
      .from('organization_subscriptions')
      .select('*, plan:organization_subscription_plans(*)')
      .eq('razorpay_subscription_id', razorpaySubId)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(`Failed to fetch organization subscription by Razorpay ID: ${error.message}`);
    }

    return data;
  }

  public async upsertSubscription(
    orgId: string,
    sub: Partial<OrgSubscription>
  ): Promise<OrgSubscription> {
    const payload = {
      ...sub,
      organization_id: orgId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('organization_subscriptions')
      .upsert(payload, { onConflict: 'organization_id' })
      .select('*, plan:organization_subscription_plans(*)')
      .single();

    if (error) {
      throw new DatabaseError(`Failed to upsert organization subscription: ${error.message}`);
    }

    return data;
  }

  public async updateSubscriptionStatus(
    orgId: string,
    status: OrgSubscriptionStatus,
    metadata?: Partial<OrgSubscription>
  ): Promise<OrgSubscription> {
    const payload: any = {
      status,
      updated_at: new Date().toISOString(),
      ...(metadata || {}),
    };

    const { data, error } = await this.supabase
      .from('organization_subscriptions')
      .update(payload)
      .eq('organization_id', orgId)
      .select('*, plan:organization_subscription_plans(*)')
      .single();

    if (error) {
      throw new DatabaseError(`Failed to update organization subscription status: ${error.message}`);
    }

    return data;
  }

  // 4. INVOICES
  public async createInvoice(invoice: Partial<OrgInvoice>): Promise<OrgInvoice> {
    const { data, error } = await this.supabase
      .from('organization_invoices')
      .insert(invoice)
      .select('*')
      .single();

    if (error) {
      throw new DatabaseError(`Failed to create organization invoice: ${error.message}`);
    }

    return data;
  }

  public async getInvoices(
    orgId: string,
    options?: { status?: OrgInvoiceStatus; limit?: number; offset?: number }
  ): Promise<{ invoices: OrgInvoice[]; total: number }> {
    let query = this.supabase
      .from('organization_invoices')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('issued_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      const from = options.offset || 0;
      const to = from + options.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;

    if (error) {
      throw new DatabaseError(`Failed to list organization invoices: ${error.message}`);
    }

    return {
      invoices: data || [],
      total: count || 0,
    };
  }

  public async getInvoiceById(orgId: string, invoiceId: string): Promise<OrgInvoice | null> {
    const { data, error } = await this.supabase
      .from('organization_invoices')
      .select('*')
      .eq('organization_id', orgId)
      .eq('id', invoiceId)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(`Failed to fetch organization invoice: ${error.message}`);
    }

    return data;
  }

  public async getInvoiceByRazorpayPaymentId(paymentId: string): Promise<OrgInvoice | null> {
    const { data, error } = await this.supabase
      .from('organization_invoices')
      .select('*')
      .eq('razorpay_payment_id', paymentId)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(`Failed to check existing invoice for payment: ${error.message}`);
    }

    return data;
  }

  public async updateInvoiceStatus(
    invoiceId: string,
    status: OrgInvoiceStatus,
    paidAt?: string
  ): Promise<OrgInvoice> {
    const payload: any = {
      status,
    };
    if (paidAt) {
      payload.paid_at = paidAt;
    }

    const { data, error } = await this.supabase
      .from('organization_invoices')
      .update(payload)
      .eq('id', invoiceId)
      .select('*')
      .single();

    if (error) {
      throw new DatabaseError(`Failed to update invoice status: ${error.message}`);
    }

    return data;
  }

  // 5. PAYMENT EVENTS (Idempotency Store)
  public async getPaymentEvent(eventId: string): Promise<OrgPaymentEvent | null> {
    const { data, error } = await this.supabase
      .from('organization_payment_events')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(`Failed to fetch payment event: ${error.message}`);
    }

    return data;
  }

  public async recordPaymentEvent(event: Partial<OrgPaymentEvent>): Promise<OrgPaymentEvent> {
    const { data, error } = await this.supabase
      .from('organization_payment_events')
      .insert(event)
      .select('*')
      .single();

    if (error) {
      throw new DatabaseError(`Failed to record payment event: ${error.message}`);
    }

    return data;
  }

  public async markPaymentEventProcessed(
    eventId: string,
    status: 'processed' | 'failed' | 'ignored',
    errorMessage?: string
  ): Promise<void> {
    const payload: any = {
      status,
      processed_at: new Date().toISOString(),
    };
    if (errorMessage) {
      payload.error_message = errorMessage;
    }

    const { error } = await this.supabase
      .from('organization_payment_events')
      .update(payload)
      .eq('event_id', eventId);

    if (error) {
      throw new DatabaseError(`Failed to update payment event status: ${error.message}`);
    }
  }

  // 6. FINANCIAL REVENUE AGGREGATION
  public async getFinancialAggregates(
    orgId: string,
    from?: string,
    to?: string
  ): Promise<{
    totalPaidPaise: number;
    paidInvoicesCount: number;
    unpaidInvoicesCount: number;
  }> {
    let query = this.supabase
      .from('organization_invoices')
      .select('amount_paise, status, issued_at')
      .eq('organization_id', orgId);

    if (from) {
      query = query.gte('issued_at', from);
    }
    if (to) {
      query = query.lte('issued_at', to + 'T23:59:59.999Z');
    }

    const { data, error } = await query;

    if (error) {
      throw new DatabaseError(`Failed to calculate financial aggregates: ${error.message}`);
    }

    const invoices = data || [];
    let totalPaidPaise = 0;
    let paidInvoicesCount = 0;
    let unpaidInvoicesCount = 0;

    for (const inv of invoices) {
      if (inv.status === 'paid') {
        totalPaidPaise += Number(inv.amount_paise) || 0;
        paidInvoicesCount++;
      } else if (inv.status === 'unpaid') {
        unpaidInvoicesCount++;
      }
    }

    return {
      totalPaidPaise,
      paidInvoicesCount,
      unpaidInvoicesCount,
    };
  }
}

export const orgBillingRepository = new OrgBillingRepository();
