import crypto from 'crypto';
import { OrgBillingRepository, orgBillingRepository } from './orgBilling.repository';
import {
  OrgSubscription,
  OrgSubscriptionPlan,
  OrgBillingAccount,
  OrgInvoice,
  OrgCheckoutIntentResult,
  OrgFinancialSummary,
  OrgSubscriptionStatus,
  VALID_ORG_SUBSCRIPTION_TRANSITIONS,
} from './orgBilling.types';
import { CreateOrgCheckoutDTOType, VerifyOrgPaymentDTOType } from './orgBilling.schemas';
import { ValidationError, AppError, NotFoundError } from '@errors/AppError';
import { logger } from '@logger/index';
import { env } from '@config/env';

export class OrgBillingService {
  private readonly baseUrl: string = 'https://api.razorpay.com/v1';

  constructor(private readonly repo: OrgBillingRepository = orgBillingRepository) {}

  private getKeyId(): string {
    return (
      process.env.RAZORPAY_ORG_KEY_ID ||
      env.RAZORPAY_KEY_ID ||
      process.env.RAZORPAY_KEY_ID ||
      ''
    );
  }

  private getKeySecret(): string {
    return (
      process.env.RAZORPAY_ORG_KEY_SECRET ||
      env.RAZORPAY_KEY_SECRET ||
      process.env.RAZORPAY_KEY_SECRET ||
      ''
    );
  }

  private getWebhookSecret(): string {
    return (
      process.env.RAZORPAY_ORG_WEBHOOK_SECRET ||
      env.RAZORPAY_WEBHOOK_SECRET ||
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      ''
    );
  }

  /**
   * Helper function for constant-time string comparison to prevent timing attacks.
   */
  public constantTimeCompare(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') return false;

    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');

    if (bufA.length !== bufB.length) return false;

    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Cryptographically verifies Razorpay payment signature using HMAC SHA-256.
   * Format: `${orderOrSubId}|${paymentId}` or `${paymentId}|${orderOrSubId}`
   */
  public verifyPaymentSignature(
    paymentId: string,
    orderOrSubscriptionId: string,
    signature: string
  ): boolean {
    const keySecret = this.getKeySecret();
    if (!signature || !paymentId || !orderOrSubscriptionId || !keySecret) {
      return false;
    }

    try {
      // Razorpay Order format: order_id + "|" + razorpay_payment_id
      const payloadOrder = `${orderOrSubscriptionId}|${paymentId}`;
      const expectedSignatureOrder = crypto
        .createHmac('sha256', keySecret)
        .update(payloadOrder)
        .digest('hex');

      if (this.constantTimeCompare(signature, expectedSignatureOrder)) {
        return true;
      }

      // Razorpay Subscription format: razorpay_payment_id + "|" + subscription_id
      const payloadSub = `${paymentId}|${orderOrSubscriptionId}`;
      const expectedSignatureSub = crypto
        .createHmac('sha256', keySecret)
        .update(payloadSub)
        .digest('hex');

      return this.constantTimeCompare(signature, expectedSignatureSub);
    } catch {
      return false;
    }
  }

  /**
   * Cryptographically verifies Razorpay webhook signature over the exact raw body string.
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
   * Validates if a state machine transition is permitted.
   */
  public validateTransition(
    current: OrgSubscriptionStatus,
    target: OrgSubscriptionStatus
  ): boolean {
    if (current === target) return true;
    const allowed = VALID_ORG_SUBSCRIPTION_TRANSITIONS[current] || [];
    return allowed.includes(target);
  }

  // 1. BILLING STATUS & PLANS
  public async getBillingStatus(orgId: string): Promise<{
    subscription: OrgSubscription | null;
    billingAccount: OrgBillingAccount | null;
    availablePlans: OrgSubscriptionPlan[];
    pricingStatus: 'configured' | 'unconfigured';
    taxStatus: 'configured' | 'unconfigured';
    hasActiveSubscription: boolean;
  }> {
    const [sub, account, plans] = await Promise.all([
      this.repo.getSubscription(orgId),
      this.repo.getBillingAccount(orgId),
      this.repo.listPlans(),
    ]);

    const hasConfiguredPlans = plans.some((p) => p.is_configured && p.amount_paise && p.amount_paise > 0);
    const hasActiveSubscription = sub?.status === 'active';

    return {
      subscription: sub,
      billingAccount: account,
      availablePlans: plans,
      pricingStatus: hasConfiguredPlans ? 'configured' : 'unconfigured',
      taxStatus: account?.tax_status === 'verified' ? 'configured' : 'unconfigured',
      hasActiveSubscription,
    };
  }

  public async getPlans(): Promise<OrgSubscriptionPlan[]> {
    return this.repo.listPlans();
  }

  public async getBillingAccount(orgId: string): Promise<OrgBillingAccount | null> {
    return this.repo.getBillingAccount(orgId);
  }

  public async updateBillingAccount(
    orgId: string,
    data: Partial<OrgBillingAccount>
  ): Promise<OrgBillingAccount> {
    return this.repo.upsertBillingAccount(orgId, data);
  }

  // 2. CHECKOUT INTENT CREATION
  public async createCheckoutIntent(
    orgId: string,
    dto: CreateOrgCheckoutDTOType
  ): Promise<OrgCheckoutIntentResult> {
    const keyId = this.getKeyId();
    const keySecret = this.getKeySecret();
    if (!keyId || !keySecret) {
      throw new AppError(
        'Razorpay API credentials unconfigured in server environment. B2B payments disabled.',
        503
      );
    }

    // Server-authoritative plan lookup
    const plan = await this.repo.getPlanByCode(dto.plan_code);
    if (!plan) {
      throw new NotFoundError(`Gym software plan '${dto.plan_code}' not found.`);
    }

    // Fail closed if plan is unconfigured or amount is invalid
    if (!plan.is_configured || !plan.amount_paise || plan.amount_paise <= 0) {
      throw new ValidationError(
        `Pricing decision pending: Plan '${plan.name}' pricing is unconfigured and requires owner approval before charges can be created.`
      );
    }

    const currentSub = await this.repo.getSubscription(orgId);
    if (currentSub?.status === 'active') {
      throw new ValidationError('Organization already has an active gym software subscription.');
    }

    // Create Razorpay Order server-side
    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
    const orderPayload = {
      amount: plan.amount_paise,
      currency: plan.currency || 'INR',
      receipt: `rec_${orgId.slice(0, 8)}_${Date.now()}`,
      notes: {
        organization_id: orgId,
        plan_code: plan.plan_code,
        interval: dto.interval,
      },
    };

    let orderData: any;
    try {
      const resp = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(orderPayload),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        logger.error({ status: resp.status, errText }, '[OrgBillingService] Razorpay order creation failed');
        throw new AppError(`Razorpay order creation failed: ${errText}`, 502);
      }

      orderData = await resp.json();
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      logger.error({ err }, '[OrgBillingService] Exception creating Razorpay order');
      throw new AppError(`Payment provider network error: ${err.message}`, 502);
    }

    // Update or insert pending subscription record
    await this.repo.upsertSubscription(orgId, {
      plan_id: plan.id,
      status: 'pending_checkout',
      billing_interval: dto.interval,
      currency: plan.currency,
      amount_paise: plan.amount_paise,
      razorpay_order_id: orderData.id,
    });

    return {
      provider: 'razorpay',
      keyId,
      orderId: orderData.id,
      amount_paise: plan.amount_paise,
      currency: plan.currency,
      plan_code: plan.plan_code,
      plan_name: plan.name,
    };
  }

  // 3. PAYMENT VERIFICATION & ACTIVATION
  public async verifyPayment(
    orgId: string,
    dto: VerifyOrgPaymentDTOType
  ): Promise<{
    subscription: OrgSubscription;
    invoice: OrgInvoice;
  }> {
    const orderOrSubId = dto.razorpay_order_id || dto.razorpay_subscription_id || '';
    if (!orderOrSubId) {
      throw new ValidationError('Missing razorpay_order_id or razorpay_subscription_id');
    }

    // Cryptographic HMAC SHA-256 verification
    const isValid = this.verifyPaymentSignature(
      dto.razorpay_payment_id,
      orderOrSubId,
      dto.razorpay_signature
    );

    if (!isValid) {
      logger.warn(
        { orgId, paymentId: dto.razorpay_payment_id },
        '[OrgBillingService] Cryptographic payment signature verification failed'
      );
      throw new AppError('Invalid payment signature', 400);
    }

    // Idempotency: check if invoice for this payment ID already exists
    const existingInvoice = await this.repo.getInvoiceByRazorpayPaymentId(dto.razorpay_payment_id);
    const existingSub = await this.repo.getSubscription(orgId);

    if (existingInvoice && existingSub?.status === 'active') {
      logger.info(
        { orgId, paymentId: dto.razorpay_payment_id },
        '[OrgBillingService] Idempotent payment verification — already processed'
      );
      return {
        subscription: existingSub,
        invoice: existingInvoice,
      };
    }

    // Lookup plan
    const plan = await this.repo.getPlanByCode(dto.plan_code);
    if (!plan) {
      throw new NotFoundError(`Plan '${dto.plan_code}' not found.`);
    }

    const now = new Date();
    const periodEnd = new Date(now);
    if (plan.interval === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Transition subscription to 'active'
    const updatedSub = await this.repo.upsertSubscription(orgId, {
      plan_id: plan.id,
      status: 'active',
      billing_interval: plan.interval,
      currency: plan.currency,
      amount_paise: plan.amount_paise || 0,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      cancelled_at: null,
      razorpay_payment_id: dto.razorpay_payment_id,
      razorpay_order_id: dto.razorpay_order_id || null,
      razorpay_subscription_id: dto.razorpay_subscription_id || null,
    });

    // Generate unique immutable invoice number: INV-YYYY-HEX
    const year = now.getFullYear();
    const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const invoiceNumber = `INV-${year}-${orgId.slice(0, 4).toUpperCase()}-${hex}`;

    // Issue invoice receipt (receipt type with unconfigured tax status)
    const invoice = await this.repo.createInvoice({
      organization_id: orgId,
      subscription_id: updatedSub.id,
      invoice_number: invoiceNumber,
      amount_paise: plan.amount_paise || 0,
      subtotal_paise: plan.amount_paise || 0,
      discount_paise: 0,
      tax_paise: 0,
      tax_details: {
        configured: false,
        status: 'unconfigured',
        note: 'GST/Tax settings unconfigured; awaiting legal review. Formatted as Payment Receipt.',
      },
      currency: plan.currency,
      status: 'paid',
      type: 'receipt',
      line_items: [
        {
          description: `${plan.name} (${plan.interval})`,
          quantity: 1,
          unit_price_paise: plan.amount_paise || 0,
          amount_paise: plan.amount_paise || 0,
        },
      ],
      razorpay_payment_id: dto.razorpay_payment_id,
      razorpay_order_id: dto.razorpay_order_id || null,
      issued_at: now.toISOString(),
      paid_at: now.toISOString(),
      notes: 'B2B Gym Software Subscription Receipt',
    });

    logger.info(
      { orgId, subId: updatedSub.id, invoiceNumber },
      '[OrgBillingService] Subscription activated successfully'
    );

    return {
      subscription: updatedSub,
      invoice,
    };
  }

  // 4. CANCEL SUBSCRIPTION
  public async cancelSubscription(
    orgId: string,
    cancelAtPeriodEnd: boolean = true,
    reason?: string
  ): Promise<OrgSubscription> {
    const sub = await this.repo.getSubscription(orgId);
    if (!sub || sub.status !== 'active') {
      throw new ValidationError('Organization does not have an active subscription to cancel.');
    }

    // Cancel on Razorpay if provider subscription ID exists
    if (sub.razorpay_subscription_id) {
      const keyId = this.getKeyId();
      const keySecret = this.getKeySecret();
      if (keyId && keySecret) {
        try {
          const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
          await fetch(`${this.baseUrl}/subscriptions/${sub.razorpay_subscription_id}/cancel`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: authHeader,
            },
            body: JSON.stringify({
              cancel_at_cycle_end: cancelAtPeriodEnd ? 1 : 0,
            }),
          });
        } catch (err: any) {
          logger.warn({ err, orgId }, '[OrgBillingService] Failed to notify Razorpay of cancellation');
        }
      }
    }

    const now = new Date().toISOString();
    const targetStatus = cancelAtPeriodEnd ? 'active' : 'cancelled';

    return this.repo.updateSubscriptionStatus(orgId, targetStatus, {
      cancel_at_period_end: cancelAtPeriodEnd,
      cancelled_at: now,
    });
  }

  // 5. INVOICES
  public async getInvoices(
    orgId: string,
    options?: { status?: any; limit?: number; offset?: number }
  ): Promise<{ invoices: OrgInvoice[]; total: number }> {
    return this.repo.getInvoices(orgId, options);
  }

  public async getInvoiceById(orgId: string, invoiceId: string): Promise<OrgInvoice> {
    const invoice = await this.repo.getInvoiceById(orgId, invoiceId);
    if (!invoice) {
      throw new NotFoundError(`Invoice '${invoiceId}' not found for organization.`);
    }
    return invoice;
  }

  // 6. AUTHORITATIVE WEBHOOK PROCESSING (IDEMPOTENT & CRYPTOGRAPHICALLY AUTHENTICATED)
  public async handleWebhook(
    rawBody: string,
    signature: string,
    payload: any
  ): Promise<{ received: boolean; status: string; idempotent?: boolean }> {
    const isValid = this.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      logger.warn('[OrgBillingService] Webhook rejected: invalid HMAC signature');
      throw new AppError('Invalid webhook signature', 400);
    }

    const eventId = payload.id || payload.event_id || `evt_${Date.now()}`;
    const eventType = payload.event;

    // Idempotency check
    const existingEvent = await this.repo.getPaymentEvent(eventId);
    if (existingEvent && existingEvent.status === 'processed') {
      logger.info({ eventId, eventType }, '[OrgBillingService] Idempotent webhook event ignored (already processed)');
      return { received: true, status: 'already_processed', idempotent: true };
    }

    // Record pending event in audit ledger
    if (!existingEvent) {
      await this.repo.recordPaymentEvent({
        event_id: eventId,
        event_type: eventType,
        provider: 'razorpay',
        payload,
        status: 'pending',
      });
    }

    try {
      if (eventType === 'payment.captured' || eventType === 'order.paid') {
        const paymentEntity = payload.payload?.payment?.entity;
        const orgId = paymentEntity?.notes?.organization_id;
        const planCode = paymentEntity?.notes?.plan_code;

        if (orgId && planCode) {
          const plan = await this.repo.getPlanByCode(planCode);
          if (plan) {
            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + 1);

            await this.repo.upsertSubscription(orgId, {
              plan_id: plan.id,
              status: 'active',
              billing_interval: plan.interval,
              currency: plan.currency,
              amount_paise: paymentEntity.amount || plan.amount_paise || 0,
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              razorpay_payment_id: paymentEntity.id,
            });

            // Prevent duplicate invoice
            const existingInv = await this.repo.getInvoiceByRazorpayPaymentId(paymentEntity.id);
            if (!existingInv) {
              const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
              await this.repo.createInvoice({
                organization_id: orgId,
                invoice_number: `INV-${now.getFullYear()}-${orgId.slice(0, 4).toUpperCase()}-${hex}`,
                amount_paise: paymentEntity.amount || plan.amount_paise || 0,
                subtotal_paise: paymentEntity.amount || plan.amount_paise || 0,
                discount_paise: 0,
                tax_paise: 0,
                tax_details: {
                  configured: false,
                  status: 'unconfigured',
                  note: 'Tax unconfigured; issued as payment receipt via webhook.',
                },
                currency: plan.currency,
                status: 'paid',
                type: 'receipt',
                line_items: [
                  {
                    description: `${plan.name} (${plan.interval})`,
                    quantity: 1,
                    unit_price_paise: paymentEntity.amount || plan.amount_paise || 0,
                    amount_paise: paymentEntity.amount || plan.amount_paise || 0,
                  },
                ],
                razorpay_payment_id: paymentEntity.id,
                issued_at: now.toISOString(),
                paid_at: now.toISOString(),
              });
            }
          }
        }
      } else if (eventType === 'payment.failed') {
        const paymentEntity = payload.payload?.payment?.entity;
        const orgId = paymentEntity?.notes?.organization_id;
        if (orgId) {
          const sub = await this.repo.getSubscription(orgId);
          if (sub && sub.status === 'active') {
            await this.repo.updateSubscriptionStatus(orgId, 'past_due');
          }
        }
      } else if (eventType === 'subscription.cancelled') {
        const subEntity = payload.payload?.subscription?.entity;
        const subId = subEntity?.id;
        if (subId) {
          const sub = await this.repo.getSubscriptionByRazorpayId(subId);
          if (sub) {
            await this.repo.updateSubscriptionStatus(sub.organization_id, 'cancelled', {
              cancelled_at: new Date().toISOString(),
            });
          }
        }
      }

      await this.repo.markPaymentEventProcessed(eventId, 'processed');
      return { received: true, status: 'processed' };
    } catch (err: any) {
      logger.error({ err, eventId }, '[OrgBillingService] Webhook processing exception');
      await this.repo.markPaymentEventProcessed(eventId, 'failed', err.message);
      throw err;
    }
  }

  // 7. FINANCIAL SUMMARY FOR PHASE 8G/8H
  public async getFinancialSummary(
    orgId: string,
    from?: string,
    to?: string
  ): Promise<OrgFinancialSummary> {
    const [sub, aggregates, plans] = await Promise.all([
      this.repo.getSubscription(orgId),
      this.repo.getFinancialAggregates(orgId, from, to),
      this.repo.listPlans(),
    ]);

    const hasConfiguredPlans = plans.some((p) => p.is_configured && p.amount_paise && p.amount_paise > 0);
    const amountInRupees = aggregates.totalPaidPaise / 100;
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amountInRupees);

    return {
      organizationId: orgId,
      timeWindow: from && to ? `${from} to ${to}` : 'all_time',
      period: {
        from: from || 'beginning',
        to: to || 'current',
      },
      currency: 'INR',
      totalCollectedPaise: aggregates.totalPaidPaise,
      totalCollectedFormatted: formatted,
      paidInvoicesCount: aggregates.paidInvoicesCount,
      unpaidInvoicesCount: aggregates.unpaidInvoicesCount,
      activePlanCode: sub?.plan?.plan_code || null,
      subscriptionStatus: sub?.status || 'none',
      pricingStatus: hasConfiguredPlans ? 'configured' : 'unconfigured',
      taxStatus: 'unconfigured',
      accountingNote:
        'Cash receipts collected from B2B gym software licenses. Does not constitute GAAP/accrual-recognized revenue. STRIVA B2C membership subscriptions are strictly isolated.',
    };
  }
}

export const orgBillingService = new OrgBillingService();
