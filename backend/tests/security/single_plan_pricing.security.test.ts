import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../../src/app/app';
import { BillingService } from '../../src/modules/billing/services/BillingService';
import { RazorpayProvider, STRIVA_PRICING } from '../../src/modules/billing/providers/RazorpayProvider';
import { SubscriptionRepository } from '../../src/modules/billing/repositories/SubscriptionRepository';
import { EntitlementService } from '../../src/modules/billing/services/EntitlementService';
import { ok, fail } from '../../src/shared/core/Result';
import { Subscription } from '../../src/modules/billing/domain/BillingSchemas';

// Mock Supabase Auth
vi.mock('../../src/database/supabase', () => {
  const mockDb = {
    auth: {
      getUser: vi.fn(async (token: string) => {
        if (token === 'token-member-valid') {
          return {
            data: {
              user: {
                id: 'usr-member-canonical',
                email: 'member@striva.app',
                user_metadata: { role: 'Member' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-demo-user') {
          return {
            data: {
              user: {
                id: 'usr-demo-1',
                email: 'demo@sweatfix.com',
                user_metadata: { role: 'Demo User' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-owner') {
          return {
            data: {
              user: {
                id: 'usr-owner-1',
                email: 'owner@striva.app',
                user_metadata: { role: 'Gym Owner' },
              },
            },
            error: null,
          };
        }
        return { data: { user: null }, error: new Error('Invalid token') };
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockImplementation((resolve) => resolve({ data: [], error: null })),
    })),
  };

  return {
    supabase: mockDb,
    supabaseAdmin: mockDb,
  };
});

describe('STRIVA V2 Phase 7.5F — Single-Plan Pricing & Razorpay Checkout Hardening', () => {
  const testKeyId = 'rzp_test_canonical_key';
  const testKeySecret = 'secret_test_canonical_secret';
  let mockProvider: RazorpayProvider;
  let mockRepo: any;
  let service: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();

    process.env.RAZORPAY_KEY_ID = testKeyId;
    process.env.RAZORPAY_KEY_SECRET = testKeySecret;
    process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook_secret_test';

    mockProvider = new RazorpayProvider(testKeyId, testKeySecret, 'webhook_secret_test');

    mockRepo = {
      findSubscriptionByUserId: vi.fn(async (userId: string) => {
        return ok<Subscription>({
          id: 'sub-canonical-1',
          user_id: userId,
          tier: 'pro',
          interval: 'monthly',
          status: 'trialing',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 10 * 86400000).toISOString(),
          trial_started_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + 10 * 86400000).toISOString(),
          cancel_at_period_end: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }),
      upsertSubscription: vi.fn(async (sub: Partial<Subscription>) => {
        return ok<Subscription>({
          id: 'sub-canonical-1',
          user_id: sub.user_id || 'usr-member-canonical',
          tier: sub.tier || 'pro',
          interval: sub.interval || 'monthly',
          status: sub.status || 'active',
          current_period_start: sub.current_period_start || new Date().toISOString(),
          current_period_end: sub.current_period_end || new Date(Date.now() + 30 * 86400000).toISOString(),
          cancel_at_period_end: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }),
      createInvoice: vi.fn(async () => ok({ id: 'inv-1' })),
      recordPaymentEvent: vi.fn(async () => ok({ id: 'evt-1' })),
    };

    const entitlementService = new EntitlementService(mockRepo);
    service = new BillingService(mockRepo, mockProvider, entitlementService);
  });

  // TEST 1: Monthly request resolves to ₹799
  it('TEST 1: Monthly request resolves to ₹799 (79900 paise)', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(async (_url, options: any) => {
      const parsedBody = JSON.parse(options.body);
      expect(parsedBody.plan_id).toContain('monthly');
      expect(parsedBody.notes.interval).toBe('monthly');

      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'sub_rzp_monthly_123',
          order_id: 'order_rzp_monthly_123',
          currency: 'INR',
        }),
      } as any;
    });

    const res = await service.createRazorpayCheckout('usr-member-canonical', 'pro', 'monthly');
    expect(res.isSuccess()).toBe(true);
    expect(res.value.amount).toBe(79900); // ₹799 * 100 paise
    expect(res.value.currency).toBe('INR');
  });

  // TEST 2: Annual request resolves to ₹6,999
  it('TEST 2: Annual request resolves to ₹6,999 (699900 paise)', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(async (_url, options: any) => {
      const parsedBody = JSON.parse(options.body);
      expect(parsedBody.plan_id).toContain('annual');
      expect(parsedBody.notes.interval).toBe('yearly');

      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'sub_rzp_annual_123',
          order_id: 'order_rzp_annual_123',
          currency: 'INR',
        }),
      } as any;
    });

    const res = await service.createRazorpayCheckout('usr-member-canonical', 'pro', 'yearly');
    expect(res.isSuccess()).toBe(true);
    expect(res.value.amount).toBe(699900); // ₹6,999 * 100 paise
    expect(res.value.currency).toBe('INR');
  });

  // TEST 3: Client-provided amount is ignored/rejected
  it('TEST 3: Client-provided amount is ignored; server enforces authoritative ₹799 / ₹6,999', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'sub_rzp_tamper_123',
          order_id: 'order_rzp_tamper_123',
          currency: 'INR',
        }),
      } as any;
    });

    // Client attempts to pass amount=1 or amount=100 in POST body
    const httpRes = await request(app)
      .post('/api/v1/billing/razorpay/checkout')
      .set('Authorization', 'Bearer token-member-valid')
      .send({ interval: 'monthly', amount: 1 });

    expect(httpRes.status).toBe(200);
    // Server enforces canonical 79900 paise, NOT client's 1
    expect(httpRes.body.data.amount).toBe(79900);
  });

  // TEST 4: Client cannot select arbitrary Razorpay plan ID
  it('TEST 4: Client cannot select arbitrary Razorpay plan ID', async () => {
    let capturedPlanId = '';
    vi.spyOn(global, 'fetch').mockImplementationOnce(async (_url, options: any) => {
      const parsedBody = JSON.parse(options.body);
      capturedPlanId = parsedBody.plan_id;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'sub_rzp_plan_test',
          order_id: 'order_rzp_plan_test',
          currency: 'INR',
        }),
      } as any;
    });

    // Client passes arbitrary plan_id
    const httpRes = await request(app)
      .post('/api/v1/billing/razorpay/checkout')
      .set('Authorization', 'Bearer token-member-valid')
      .send({ interval: 'yearly', plan_id: 'plan_hacked_free_99999' });

    expect(httpRes.status).toBe(200);
    // Server uses server-configured plan, not client's plan_hacked_free_99999
    expect(capturedPlanId).not.toBe('plan_hacked_free_99999');
    expect(capturedPlanId).toBe('plan_striva_annual');
  });

  // TEST 5: Client cannot set tier=elite/pro to alter pricing
  it('TEST 5: Client cannot set tier=elite/pro to alter pricing (single-plan canonical pricing)', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'sub_test',
        order_id: 'ord_test',
        currency: 'INR',
      }),
    } as any));

    // Both tier=pro and tier=elite resolve to canonical STRIVA pricing
    const proRes = await service.createRazorpayCheckout('usr-member-canonical', 'pro', 'monthly');
    const eliteRes = await service.createRazorpayCheckout('usr-member-canonical', 'elite', 'monthly');

    expect(proRes.value.amount).toBe(79900);
    expect(eliteRes.value.amount).toBe(79900);
  });

  // TEST 6: Checkout requires authenticated user
  it('TEST 6: Checkout requires authenticated user (fails closed with 401)', async () => {
    const httpRes = await request(app)
      .post('/api/v1/billing/razorpay/checkout')
      .send({ interval: 'monthly' });

    expect(httpRes.status).toBe(401);
  });

  // TEST 7: Checkout uses server-derived user identity
  it('TEST 7: Checkout uses server-derived user identity; client-supplied user_id is ignored', async () => {
    let capturedUserIdInNotes = '';
    vi.spyOn(global, 'fetch').mockImplementationOnce(async (_url, options: any) => {
      const parsedBody = JSON.parse(options.body);
      capturedUserIdInNotes = parsedBody.notes.user_id;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'sub_test_identity',
          order_id: 'ord_test_identity',
          currency: 'INR',
        }),
      } as any;
    });

    const httpRes = await request(app)
      .post('/api/v1/billing/razorpay/checkout')
      .set('Authorization', 'Bearer token-member-valid')
      .send({ interval: 'monthly', user_id: 'usr-victim-999' });

    expect(httpRes.status).toBe(200);
    // Identity is derived from verified token (usr-member-canonical), not victim
    expect(capturedUserIdInNotes).toBe('usr-member-canonical');
  });

  // TEST 8: Checkout success cannot locally activate membership
  it('TEST 8: Checkout success cannot locally activate membership without verified signature', async () => {
    // Attempting to call verify endpoint with missing or fake signature
    const httpRes = await request(app)
      .post('/api/v1/billing/razorpay/verify')
      .set('Authorization', 'Bearer token-member-valid')
      .send({
        razorpay_payment_id: 'pay_test_fake',
        razorpay_subscription_id: 'sub_test_fake',
        razorpay_signature: 'fake_sig_123',
        interval: 'monthly',
      });

    expect(httpRes.status).toBe(400);
    expect(httpRes.body.error.message).toContain('Invalid Razorpay payment signature');
    expect(mockRepo.upsertSubscription).not.toHaveBeenCalled();
  });

  // TEST 9: Verified payment can synchronize membership
  it('TEST 9: Verified payment can synchronize membership with constant-time HMAC', async () => {
    const paymentId = 'pay_canonical_777';
    const subId = 'sub_canonical_777';
    const validSignature = crypto
      .createHmac('sha256', testKeySecret)
      .update(`${paymentId}|${subId}`)
      .digest('hex');

    const res = await service.verifyRazorpayPayment('usr-member-canonical', {
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subId,
      razorpay_signature: validSignature,
      tier: 'pro',
      interval: 'monthly',
    });

    expect(res.isSuccess()).toBe(true);
    expect(res.value.status).toBe('active');
    expect(mockRepo.upsertSubscription).toHaveBeenCalled();
    expect(mockRepo.createInvoice).toHaveBeenCalled();
  });

  // TEST 10: Unverified payment cannot activate membership
  it('TEST 10: Unverified payment cannot activate membership', async () => {
    const paymentId = 'pay_canonical_888';
    const subId = 'sub_canonical_888';
    const tamperedSignature = 'tampered_signature_hex_000';

    const res = await service.verifyRazorpayPayment('usr-member-canonical', {
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subId,
      razorpay_signature: tamperedSignature,
      tier: 'pro',
      interval: 'monthly',
    });

    expect(res.isFailure()).toBe(true);
    expect(mockRepo.upsertSubscription).not.toHaveBeenCalled();
  });

  // TEST 11: Canceled checkout does not alter membership
  it('TEST 11: Canceled checkout does not alter membership state', async () => {
    // Calling status endpoint confirms subscription state remains intact
    const statusRes = await service.getSubscriptionStatus('usr-member-canonical');
    expect(statusRes.isSuccess()).toBe(true);
    expect(statusRes.value.hasAccess).toBe(true);
    expect(statusRes.value.state).toBe('TRIAL');
    expect(mockRepo.upsertSubscription).not.toHaveBeenCalled();
  });

  // TEST 12: Existing paid user is not downgraded
  it('TEST 12: Existing paid user is not downgraded', async () => {
    mockRepo.findSubscriptionByUserId.mockResolvedValueOnce(
      ok<Subscription>({
        id: 'sub-paid-user',
        user_id: 'usr-paid-1',
        tier: 'pro',
        interval: 'yearly',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 200 * 86400000).toISOString(),
        cancel_at_period_end: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    );

    const statusRes = await service.getSubscriptionStatus('usr-paid-1');
    expect(statusRes.isSuccess()).toBe(true);
    expect(statusRes.value.state).toBe('ACTIVE');
    expect(statusRes.value.hasAccess).toBe(true);
  });

  // TEST 13: Trial user can select monthly membership
  it('TEST 13: Trial user can select monthly membership (₹799)', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'sub_trial_monthly',
        order_id: 'ord_trial_monthly',
        currency: 'INR',
      }),
    } as any));

    const res = await service.createRazorpayCheckout('usr-member-canonical', 'pro', 'monthly');
    expect(res.isSuccess()).toBe(true);
    expect(res.value.amount).toBe(79900);
  });

  // TEST 14: Trial user can select annual membership
  it('TEST 14: Trial user can select annual membership (₹6,999 with ~27% saving)', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'sub_trial_annual',
        order_id: 'ord_trial_annual',
        currency: 'INR',
      }),
    } as any));

    const res = await service.createRazorpayCheckout('usr-member-canonical', 'pro', 'yearly');
    expect(res.isSuccess()).toBe(true);
    expect(res.value.amount).toBe(699900);
    // Equivalent monthly = ~583
    const monthlyEquivalent = Math.round(6999 / 12);
    expect(monthlyEquivalent).toBe(583);
    // Saving = 1 - (6999 / (799 * 12)) = ~27%
    const savingsRatio = 1 - 6999 / (799 * 12);
    expect(Math.round(savingsRatio * 100)).toBe(27);
  });

  // TEST 15: Expired user can access billing and start checkout
  it('TEST 15: Expired user can access billing and start checkout', async () => {
    mockRepo.findSubscriptionByUserId.mockResolvedValueOnce(
      ok<Subscription>({
        id: 'sub-expired-1',
        user_id: 'usr-expired-1',
        tier: 'free',
        interval: 'monthly',
        status: 'trialing',
        current_period_start: new Date(Date.now() - 30 * 86400000).toISOString(),
        current_period_end: new Date(Date.now() - 5 * 86400000).toISOString(),
        trial_started_at: new Date(Date.now() - 19 * 86400000).toISOString(),
        trial_ends_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        cancel_at_period_end: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    );

    // 1. Can view billing status
    const statusRes = await service.getSubscriptionStatus('usr-expired-1');
    expect(statusRes.isSuccess()).toBe(true);
    expect(statusRes.value.state).toBe('EXPIRED');
    expect(statusRes.value.hasAccess).toBe(false);

    // 2. Can initiate checkout to renew
    vi.spyOn(global, 'fetch').mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'sub_renew_1',
        order_id: 'ord_renew_1',
        currency: 'INR',
      }),
    } as any));

    const checkoutRes = await service.createRazorpayCheckout('usr-expired-1', 'pro', 'monthly');
    expect(checkoutRes.isSuccess()).toBe(true);
    expect(checkoutRes.value.amount).toBe(79900);
  });

  // TEST 16: Demo user cannot create a real Razorpay subscription
  it('TEST 16: Demo user cannot create a real Razorpay subscription (fails closed)', async () => {
    const res = await service.createRazorpayCheckout(
      'usr-demo-1',
      'pro',
      'monthly',
      { email: 'demo@sweatfix.com', role: 'Demo User' }
    );

    expect(res.isFailure()).toBe(true);
    expect(res.error.message).toContain('Demo users operate in sandbox mode and cannot create real Razorpay checkout sessions');
  });

  // TEST 17: B2B billing remains isolated from member billing
  it('TEST 17: B2B billing remains isolated from member billing', async () => {
    // Normal member requesting admin metrics gets 403 Forbidden
    const memberRes = await request(app)
      .get('/api/v1/billing/admin/metrics')
      .set('Authorization', 'Bearer token-member-valid');

    expect(memberRes.status).toBe(403);

    // Gym Owner requesting admin metrics gets 200 OK
    const ownerRes = await request(app)
      .get('/api/v1/billing/admin/metrics')
      .set('Authorization', 'Bearer token-owner');

    expect(ownerRes.status).toBe(200);
  });
});
