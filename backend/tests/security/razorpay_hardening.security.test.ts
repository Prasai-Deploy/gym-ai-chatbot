import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../../src/app/app';
import { BillingService } from '../../src/modules/billing/services/BillingService';
import { RazorpayProvider } from '../../src/modules/billing/providers/RazorpayProvider';
import { SubscriptionRepository } from '../../src/modules/billing/repositories/SubscriptionRepository';
import { EntitlementService } from '../../src/modules/billing/services/EntitlementService';
import { ok, fail } from '../../src/shared/core/Result';
import { Subscription } from '../../src/modules/billing/domain/BillingSchemas';

// ---------------------------------------------------------------------------
// Supabase & Auth Mocks for Route Tests
// ---------------------------------------------------------------------------
vi.mock('../../src/database/supabase', () => {
  const mockDb = {
    auth: {
      getUser: vi.fn(async (token: string) => {
        if (token === 'token-member-1') {
          return { data: { user: { id: 'usr-member-100', email: 'member100@striva.app', user_metadata: { role: 'Member' } } }, error: null };
        }
        if (token === 'token-demo') {
          return { data: { user: { id: 'usr-demo-1', email: 'demo@sweatfix.com', user_metadata: { role: 'Demo User' } } }, error: null };
        }
        return { data: { user: null }, error: new Error('Invalid token') };
      }),
    },
    from: vi.fn((table: string) => {
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(async () => {
          if (table === 'subscriptions') {
            return {
              data: {
                id: 'sub-100',
                user_id: 'usr-member-100',
                tier: 'pro',
                interval: 'monthly',
                status: 'trialing',
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 10 * 86400000).toISOString(),
                trial_started_at: new Date().toISOString(),
                trial_ends_at: new Date(Date.now() + 10 * 86400000).toISOString(),
                cancel_at_period_end: false,
              },
              error: null,
            };
          }
          return { data: null, error: null };
        }),
        maybeSingle: vi.fn().mockImplementation(async () => {
          if (table === 'subscriptions') {
            return {
              data: {
                id: 'sub-100',
                user_id: 'usr-member-100',
                tier: 'pro',
                interval: 'monthly',
                status: 'trialing',
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 10 * 86400000).toISOString(),
                trial_started_at: new Date().toISOString(),
                trial_ends_at: new Date(Date.now() + 10 * 86400000).toISOString(),
                cancel_at_period_end: false,
              },
              error: null,
            };
          }
          return { data: null, error: null };
        }),
        then: vi.fn().mockImplementation((resolve) => resolve({ data: [], error: null })),
      };
    }),
  };

  return {
    supabase: mockDb,
    supabaseAdmin: mockDb,
  };
});

describe('STRIVA V2 — Phase 7.5D Razorpay & Subscription Hardening Suite', () => {
  const testKeyId = 'rzp_test_key_phase7d';
  const testKeySecret = 'test_secret_key_phase7d';
  const testWebhookSecret = 'test_whsec_secret_phase7d';

  let provider: RazorpayProvider;
  let mockRepo: any;
  let entitlementService: EntitlementService;
  let service: BillingService;

  beforeEach(() => {
    provider = new RazorpayProvider(testKeyId, testKeySecret, testWebhookSecret);
    mockRepo = {
      getByUserId: vi.fn(),
      findSubscriptionByUserId: vi.fn(),
      findSubscriptionByRazorpaySubId: vi.fn(),
      upsertSubscription: vi.fn(),
      createInvoice: vi.fn(),
      getInvoices: vi.fn().mockResolvedValue(ok([])),
      recordPaymentEvent: vi.fn(),
      isPaymentEventProcessed: vi.fn(),
      checkAndUpdateFeatureUsage: vi.fn(),
      getAdminRevenueMetrics: vi.fn(),
    };
    entitlementService = new EntitlementService(mockRepo);
    service = new BillingService(mockRepo, provider, entitlementService);
  });

  const computeHmac = (payload: string, secret: string): string => {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  };

  // =========================================================================
  // 1. REMOVE CLIENT-CONTROLLED SUBSCRIPTION MUTATION
  // =========================================================================
  it('TEST 1: PATCH /api/v1/billing/subscription is completely removed (returns 404)', async () => {
    const res = await request(app)
      .patch('/api/v1/billing/subscription')
      .set('Authorization', 'Bearer token-member-1')
      .send({ tier: 'elite', status: 'active' });

    expect(res.status).toBe(404);
  });

  it('TEST 2: Normal member cannot call any client endpoint to grant itself active paid subscription', async () => {
    // Attempting to self-upgrade via PATCH /api/v1/billing/subscription fails with 404
    const res = await request(app)
      .patch('/api/v1/billing/subscription')
      .set('Authorization', 'Bearer token-member-1')
      .send({ tier: 'pro', status: 'active', current_period_end: '2099-01-01T00:00:00.000Z' });

    expect(res.status).toBe(404);
  });

  // =========================================================================
  // 2. LEGACY UNVERIFIED WEBHOOK DEPRECATION
  // =========================================================================
  it('TEST 3: Legacy POST /api/v1/billing/webhook is deprecated and returns HTTP 410 Gone', async () => {
    const res = await request(app)
      .post('/api/v1/billing/webhook')
      .send({ event: 'checkout.session.completed', user_id: 'usr-member-100', tier: 'pro' });

    expect(res.status).toBe(410);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ENDPOINT_DEPRECATED');
  });

  // =========================================================================
  // 3. CANONICAL RAZORPAY WEBHOOK HARDENING
  // =========================================================================
  it('TEST 4: Webhook rejects request when HMAC SHA-256 signature is missing or invalid', async () => {
    const rawBody = JSON.stringify({ event: 'payment.captured' });

    // Missing signature
    const resMissing = await service.handleRazorpayWebhook(rawBody, '', { event: 'payment.captured' });
    expect(resMissing.isFailure()).toBe(true);
    expect(resMissing.error.message).toContain('Missing Razorpay webhook signature');

    // Invalid signature
    const resInvalid = await service.handleRazorpayWebhook(rawBody, 'invalid_sig', { event: 'payment.captured' });
    expect(resInvalid.isFailure()).toBe(true);
    expect(resInvalid.error.message).toContain('Invalid Razorpay webhook signature');
  });

  it('TEST 5: Webhook signature verification fails closed if webhook secret is not configured on server', async () => {
    const providerWithoutSecret = new RazorpayProvider(testKeyId, testKeySecret, '');
    const serviceWithoutSecret = new BillingService(mockRepo, providerWithoutSecret);

    const rawBody = JSON.stringify({ event: 'payment.captured' });
    const sig = computeHmac(rawBody, 'some_secret');

    const res = await serviceWithoutSecret.handleRazorpayWebhook(rawBody, sig, { event: 'payment.captured' });
    expect(res.isFailure()).toBe(true);
    expect(res.error.message).toContain('Invalid Razorpay webhook signature');
  });

  it('TEST 6: Webhook rejects request when raw body is tampered with', async () => {
    const originalBody = JSON.stringify({ event: 'payment.captured', amount: 149900 });
    const signature = computeHmac(originalBody, testWebhookSecret);

    const tamperedBody = JSON.stringify({ event: 'payment.captured', amount: 0 });

    const res = await service.handleRazorpayWebhook(tamperedBody, signature, { event: 'payment.captured', amount: 0 });
    expect(res.isFailure()).toBe(true);
    expect(res.error.message).toContain('Invalid Razorpay webhook signature');
  });

  it('TEST 7: Webhook rejects malformed payloads missing event name', async () => {
    const rawBody = JSON.stringify({ some_random_field: 123 });
    const signature = computeHmac(rawBody, testWebhookSecret);

    const res = await service.handleRazorpayWebhook(rawBody, signature, { some_random_field: 123 });
    expect(res.isFailure()).toBe(true);
    expect(res.error.message).toContain('Malformed Razorpay webhook payload');
  });

  it('TEST 8: Webhook enforces idempotency — duplicate event does not mutate billing state twice', async () => {
    const payload = {
      event: 'subscription.charged',
      event_id: 'evt_test_unique_123',
      payload: {
        subscription: {
          entity: {
            id: 'sub_test_123',
            notes: { user_id: 'usr-member-100', tier: 'pro', interval: 'monthly' },
          },
        },
      },
    };
    const rawBody = JSON.stringify(payload);
    const signature = computeHmac(rawBody, testWebhookSecret);

    // Mock recordPaymentEvent returns false on second execution (idempotency hit)
    mockRepo.recordPaymentEvent.mockResolvedValueOnce(ok(true));
    mockRepo.upsertSubscription.mockResolvedValue(ok({ id: 'sub-100' } as Subscription));
    mockRepo.createInvoice.mockResolvedValue(ok({ id: 'inv-1' }));

    // 1st execution succeeds
    const res1 = await service.handleRazorpayWebhook(rawBody, signature, payload);
    expect(res1.isSuccess()).toBe(true);
    expect(res1.value.processed).toBe(true);
    expect(mockRepo.upsertSubscription).toHaveBeenCalledTimes(1);

    // 2nd execution returns idempotency duplicate
    mockRepo.recordPaymentEvent.mockResolvedValueOnce(ok(false));
    const res2 = await service.handleRazorpayWebhook(rawBody, signature, payload);
    expect(res2.isSuccess()).toBe(true);
    expect(res2.value.processed).toBe(false);
    expect(res2.value.reason).toBe('IDEMPOTENT_DUPLICATE');
    // Ensure upsertSubscription was NOT called a second time
    expect(mockRepo.upsertSubscription).toHaveBeenCalledTimes(1);
  });

  it('TEST 9: Webhook subscription.charged synchronizes active subscription and creates invoice', async () => {
    const payload = {
      event: 'subscription.charged',
      event_id: 'evt_charge_999',
      payload: {
        subscription: {
          entity: {
            id: 'sub_rzp_live_999',
            customer_id: 'cust_rzp_999',
            current_start: 1700000000,
            current_end: 1702592000,
            notes: { user_id: 'usr-member-100', tier: 'elite', interval: 'yearly' },
          },
        },
        payment: {
          entity: {
            id: 'pay_rzp_live_999',
            amount: 3999000, // in paise
            currency: 'INR',
          },
        },
      },
    };
    const rawBody = JSON.stringify(payload);
    const signature = computeHmac(rawBody, testWebhookSecret);

    mockRepo.recordPaymentEvent.mockResolvedValue(ok(true));
    mockRepo.upsertSubscription.mockResolvedValue(ok({ id: 'sub-100' } as Subscription));
    mockRepo.createInvoice.mockResolvedValue(ok({ id: 'inv-100' }));

    const res = await service.handleRazorpayWebhook(rawBody, signature, payload);
    expect(res.isSuccess()).toBe(true);
    expect(res.value.processed).toBe(true);

    // Verify subscription upsert
    expect(mockRepo.upsertSubscription).toHaveBeenCalledWith('usr-member-100', expect.objectContaining({
      tier: 'elite',
      interval: 'yearly',
      status: 'active',
      provider: 'razorpay',
      razorpay_subscription_id: 'sub_rzp_live_999',
      razorpay_payment_id: 'pay_rzp_live_999',
    }));

    // Verify invoice created with amount converted from paise
    expect(mockRepo.createInvoice).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'usr-member-100',
      stripe_invoice_id: 'pay_rzp_live_999',
      amount_paid: 39990,
      currency: 'inr',
      status: 'paid',
    }));
  });

  it('TEST 10: Webhook payment.failed sets subscription to past_due', async () => {
    const payload = {
      event: 'payment.failed',
      event_id: 'evt_fail_111',
      payload: {
        payment: {
          entity: {
            id: 'pay_failed_111',
            notes: { user_id: 'usr-member-100' },
          },
        },
      },
    };
    const rawBody = JSON.stringify(payload);
    const signature = computeHmac(rawBody, testWebhookSecret);

    mockRepo.recordPaymentEvent.mockResolvedValue(ok(true));
    mockRepo.upsertSubscription.mockResolvedValue(ok({ id: 'sub-100' } as Subscription));

    const res = await service.handleRazorpayWebhook(rawBody, signature, payload);
    expect(res.isSuccess()).toBe(true);
    expect(res.value.processed).toBe(true);

    expect(mockRepo.upsertSubscription).toHaveBeenCalledWith('usr-member-100', expect.objectContaining({
      status: 'past_due',
    }));
  });

  it('TEST 11: Webhook subscription.cancelled sets canceled status and records timestamp without terminating paid cycle prematurely', async () => {
    const payload = {
      event: 'subscription.cancelled',
      event_id: 'evt_cancel_222',
      payload: {
        subscription: {
          entity: {
            id: 'sub_rzp_cancel_222',
            notes: { user_id: 'usr-member-100' },
          },
        },
      },
    };
    const rawBody = JSON.stringify(payload);
    const signature = computeHmac(rawBody, testWebhookSecret);

    mockRepo.recordPaymentEvent.mockResolvedValue(ok(true));
    mockRepo.upsertSubscription.mockResolvedValue(ok({ id: 'sub-100' } as Subscription));

    const res = await service.handleRazorpayWebhook(rawBody, signature, payload);
    expect(res.isSuccess()).toBe(true);
    expect(res.value.processed).toBe(true);

    expect(mockRepo.upsertSubscription).toHaveBeenCalledWith('usr-member-100', expect.objectContaining({
      status: 'canceled',
      cancel_at_period_end: true,
      canceled_at: expect.any(String),
    }));
  });

  it('TEST 12: Webhook subscription.halted marks subscription as past_due', async () => {
    const payload = {
      event: 'subscription.halted',
      event_id: 'evt_halt_333',
      payload: {
        subscription: {
          entity: {
            id: 'sub_rzp_halt_333',
            notes: { user_id: 'usr-member-100' },
          },
        },
      },
    };
    const rawBody = JSON.stringify(payload);
    const signature = computeHmac(rawBody, testWebhookSecret);

    mockRepo.recordPaymentEvent.mockResolvedValue(ok(true));
    mockRepo.upsertSubscription.mockResolvedValue(ok({ id: 'sub-100' } as Subscription));

    const res = await service.handleRazorpayWebhook(rawBody, signature, payload);
    expect(res.isSuccess()).toBe(true);
    expect(res.value.processed).toBe(true);

    expect(mockRepo.upsertSubscription).toHaveBeenCalledWith('usr-member-100', expect.objectContaining({
      status: 'past_due',
    }));
  });

  it('TEST 13: Webhook unhandled event safely acknowledges without mutating subscription', async () => {
    const payload = {
      event: 'refund.created',
      event_id: 'evt_refund_444',
      payload: {},
    };
    const rawBody = JSON.stringify(payload);
    const signature = computeHmac(rawBody, testWebhookSecret);

    mockRepo.recordPaymentEvent.mockResolvedValue(ok(true));

    const res = await service.handleRazorpayWebhook(rawBody, signature, payload);
    expect(res.isSuccess()).toBe(true);
    expect(res.value.processed).toBe(false);
    expect(mockRepo.upsertSubscription).not.toHaveBeenCalled();
  });

  // =========================================================================
  // 4. RAZORPAY CHECKOUT & VERIFY HARDENING
  // =========================================================================
  it('TEST 14: POST /api/v1/billing/razorpay/checkout rejects tier=free', async () => {
    const res = await service.createRazorpayCheckout('usr-member-100', 'free' as any, 'monthly');
    expect(res.isFailure()).toBe(true);
    expect(res.error.message).toContain('Checkout is only available for paid subscription tiers');
  });

  it('TEST 15: POST /api/v1/billing/razorpay/verify requires valid cryptographic signature', async () => {
    const paymentId = 'pay_test_555';
    const subId = 'sub_test_555';
    const invalidSignature = 'invalid_signature_hex';

    const res = await service.verifyRazorpayPayment('usr-member-100', {
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subId,
      razorpay_signature: invalidSignature,
      tier: 'pro',
      interval: 'monthly',
    });

    expect(res.isFailure()).toBe(true);
    expect(res.error.message).toContain('Invalid Razorpay payment signature');
    expect(mockRepo.upsertSubscription).not.toHaveBeenCalled();
  });

  it('TEST 16: POST /api/v1/billing/razorpay/verify computes period dates server-side upon valid signature', async () => {
    const paymentId = 'pay_test_777';
    const subId = 'sub_test_777';
    const validSignature = computeHmac(`${paymentId}|${subId}`, testKeySecret);

    mockRepo.recordPaymentEvent.mockResolvedValue(ok(true));
    mockRepo.upsertSubscription.mockResolvedValue(ok({ id: 'sub-777' } as Subscription));
    mockRepo.createInvoice.mockResolvedValue(ok({ id: 'inv-777' }));

    const res = await service.verifyRazorpayPayment('usr-member-100', {
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subId,
      razorpay_signature: validSignature,
      tier: 'pro',
      interval: 'monthly',
    });

    expect(res.isSuccess()).toBe(true);
    expect(mockRepo.upsertSubscription).toHaveBeenCalledWith('usr-member-100', expect.objectContaining({
      tier: 'pro',
      interval: 'monthly',
      status: 'active',
      provider: 'razorpay',
      razorpay_subscription_id: subId,
      razorpay_payment_id: paymentId,
      current_period_start: expect.any(String),
      current_period_end: expect.any(String),
    }));
  });

  // =========================================================================
  // 5. BILLING STATUS & SENSITIVE CREDENTIAL EXCLUSION
  // =========================================================================
  it('TEST 17: GET /api/v1/billing/status returns authoritative entitlement without exposing provider secrets', async () => {
    const existingSub: Subscription = {
      id: 'sub-100',
      user_id: 'usr-member-100',
      tier: 'pro',
      interval: 'monthly',
      status: 'active',
      provider: 'razorpay',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 20 * 86400000).toISOString(),
      cancel_at_period_end: false,
      canceled_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockRepo.findSubscriptionByUserId.mockResolvedValue(ok(existingSub));

    const res = await service.getSubscriptionStatus('usr-member-100', { id: 'usr-member-100', role: 'Member' });
    expect(res.isSuccess()).toBe(true);
    const data = res.value;

    // Must include authoritative fields
    expect(data.state).toBe('ACTIVE');
    expect(data.hasAccess).toBe(true);
    expect(data.daysRemaining).toBe(20);
    expect(data.tier).toBe('pro');
    expect(data.status).toBe('active');
    expect(data.cancelAtPeriodEnd).toBe(false);

    // Must NEVER leak secrets
    expect((data as any).razorpay_key_secret).toBeUndefined();
    expect((data as any).keySecret).toBeUndefined();
    expect((data as any).webhookSecret).toBeUndefined();
  });

  it('TEST 18: GET /api/v1/billing/status works for Demo User without database lookups', async () => {
    const res = await service.getSubscriptionStatus('usr-demo-1', {
      id: 'usr-demo-1',
      email: 'demo@sweatfix.com',
      role: 'Demo User',
    });

    expect(res.isSuccess()).toBe(true);
    const data = res.value;
    expect(data.state).toBe('DEMO');
    expect(data.hasAccess).toBe(true);
  });
});
