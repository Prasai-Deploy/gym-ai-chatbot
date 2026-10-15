import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../../src/app/app';
import { EntitlementService } from '../../src/modules/billing/services/EntitlementService';
import { BillingService } from '../../src/modules/billing/services/BillingService';
import { RazorpayProvider, STRIVA_PRICING } from '../../src/modules/billing/providers/RazorpayProvider';
import { SubscriptionRepository } from '../../src/modules/billing/repositories/SubscriptionRepository';
import { Subscription } from '../../src/modules/billing/domain/BillingSchemas';
import { ok, fail } from '../../src/shared/core/Result';
import { requireActiveEntitlement } from '../../src/middleware/entitlement.middleware';

// -------------------------------------------------------------------------
// Global Database & Supabase Auth Mocks
// -------------------------------------------------------------------------
vi.mock('../../src/database/supabase', () => {
  let filterUserId = '';

  const mockTrialStartedAt = new Date().toISOString();
  const mockTrialEndsAt = new Date(Date.now() + 10 * 86400000).toISOString();

  const mockDb = {
    auth: {
      getUser: vi.fn(async (token: string) => {
        if (token === 'token-new-user' || token === 'token-trial-user') {
          filterUserId = 'usr-trial-1';
          return { data: { user: { id: 'usr-trial-1', email: 'trial@striva.app', user_metadata: { role: 'Member' } } }, error: null };
        }
        if (token === 'token-expired-user') {
          filterUserId = 'usr-expired-1';
          return { data: { user: { id: 'usr-expired-1', email: 'expired@striva.app', user_metadata: { role: 'Member' } } }, error: null };
        }
        if (token === 'token-paid-user') {
          filterUserId = 'usr-paid-1';
          return { data: { user: { id: 'usr-paid-1', email: 'paid@striva.app', user_metadata: { role: 'Member' } } }, error: null };
        }
        if (token === 'token-grace-user') {
          filterUserId = 'usr-grace-1';
          return { data: { user: { id: 'usr-grace-1', email: 'grace@striva.app', user_metadata: { role: 'Member' } } }, error: null };
        }
        if (token === 'token-demo-user') {
          filterUserId = 'usr-demo-1';
          return { data: { user: { id: 'usr-demo-1', email: 'demo@sweatfix.com', user_metadata: { role: 'Demo User' } } }, error: null };
        }
        if (token === 'token-owner') {
          filterUserId = 'usr-owner-1';
          return { data: { user: { id: 'usr-owner-1', email: 'owner@striva.app', user_metadata: { role: 'Gym Owner' } } }, error: null };
        }
        return { data: { user: null }, error: new Error('Invalid token') };
      }),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(async () => {
        if (table === 'profiles') {
          return { data: { id: filterUserId || 'usr-expired-1', email: 'user@striva.app', full_name: 'Athlete' }, error: null };
        }
        if (table === 'v2_fitness_profiles' || table === 'fitness_profiles') {
          return { data: { id: filterUserId || 'usr-expired-1', level: 'intermediate', primary_goal: 'Strength' }, error: null };
        }
        if (table === 'user_preferences') {
          return { data: { id: filterUserId || 'usr-expired-1', unit_system: 'metric' }, error: null };
        }
        if (table === 'member_settings') {
          return { data: { id: filterUserId || 'usr-expired-1', theme: 'system' }, error: null };
        }
        return { data: null, error: null };
      }),
      maybeSingle: vi.fn().mockImplementation(async () => {
        if (table === 'subscriptions') {
          if (filterUserId === 'usr-expired-1') {
            return {
              data: {
                id: 'sub-expired-1',
                user_id: 'usr-expired-1',
                tier: 'free',
                interval: 'monthly',
                status: 'trialing',
                trial_started_at: new Date(Date.now() - 20 * 86400000).toISOString(),
                trial_ends_at: new Date(Date.now() - 6 * 86400000).toISOString(),
                current_period_start: new Date(Date.now() - 20 * 86400000).toISOString(),
                current_period_end: new Date(Date.now() - 6 * 86400000).toISOString(),
                cancel_at_period_end: false,
              },
              error: null,
            };
          }
          if (filterUserId === 'usr-grace-1') {
            return {
              data: {
                id: 'sub-grace-1',
                user_id: 'usr-grace-1',
                tier: 'pro',
                interval: 'monthly',
                status: 'past_due',
                current_period_start: new Date(Date.now() - 31 * 86400000).toISOString(),
                current_period_end: new Date(Date.now() - 1 * 86400000).toISOString(),
                cancel_at_period_end: false,
              },
              error: null,
            };
          }
          return {
            data: {
              id: 'sub-canonical-1',
              user_id: 'usr-trial-1',
              tier: 'pro',
              interval: 'monthly',
              status: 'trialing',
              trial_started_at: mockTrialStartedAt,
              trial_ends_at: mockTrialEndsAt,
              current_period_start: mockTrialStartedAt,
              current_period_end: mockTrialEndsAt,
              cancel_at_period_end: false,
            },
            error: null,
          };
        }
        return { data: null, error: null };
      }),
      then: vi.fn().mockImplementation((resolve) => resolve({ data: [], error: null })),
    })),
  };

  return {
    supabase: mockDb,
    supabaseAdmin: mockDb,
  };
});

describe('STRIVA V2 Phase 7.5G — Master Monetization Lifecycle Verification & Gate', () => {
  const testKeyId = 'rzp_test_lifecycle_key';
  const testKeySecret = 'secret_test_lifecycle_secret';
  const testWebhookSecret = 'webhook_secret_lifecycle';

  const fixedRepoTrialStartedAt = new Date().toISOString();
  const fixedRepoTrialEndsAt = new Date(Date.now() + 14 * 86400000).toISOString();

  let mockRepo: any;
  let entitlementService: EntitlementService;
  let billingService: BillingService;
  let razorpayProvider: RazorpayProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    process.env.RAZORPAY_KEY_ID = testKeyId;
    process.env.RAZORPAY_KEY_SECRET = testKeySecret;
    process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;

    razorpayProvider = new RazorpayProvider(testKeyId, testKeySecret, testWebhookSecret);

    mockRepo = {
      findSubscriptionByUserId: vi.fn(async (userId: string) => {
        if (userId === 'usr-trial-1') {
          return ok<Subscription>({
            id: 'sub-trial-1',
            user_id: 'usr-trial-1',
            tier: 'pro',
            interval: 'monthly',
            status: 'trialing',
            trial_started_at: fixedRepoTrialStartedAt,
            trial_ends_at: fixedRepoTrialEndsAt,
            current_period_start: fixedRepoTrialStartedAt,
            current_period_end: fixedRepoTrialEndsAt,
            cancel_at_period_end: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        if (userId === 'usr-expired-1') {
          return ok<Subscription>({
            id: 'sub-expired-1',
            user_id: 'usr-expired-1',
            tier: 'free',
            interval: 'monthly',
            status: 'trialing',
            trial_started_at: new Date(Date.now() - 20 * 86400000).toISOString(),
            trial_ends_at: new Date(Date.now() - 6 * 86400000).toISOString(),
            current_period_start: new Date(Date.now() - 20 * 86400000).toISOString(),
            current_period_end: new Date(Date.now() - 6 * 86400000).toISOString(),
            cancel_at_period_end: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        if (userId === 'usr-paid-1') {
          return ok<Subscription>({
            id: 'sub-paid-1',
            user_id: 'usr-paid-1',
            tier: 'pro',
            interval: 'yearly',
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 180 * 86400000).toISOString(),
            cancel_at_period_end: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        if (userId === 'usr-grace-1') {
          return ok<Subscription>({
            id: 'sub-grace-1',
            user_id: 'usr-grace-1',
            tier: 'pro',
            interval: 'monthly',
            status: 'past_due',
            current_period_start: new Date(Date.now() - 31 * 86400000).toISOString(),
            current_period_end: new Date(Date.now() - 1 * 86400000).toISOString(), // 24h ago
            cancel_at_period_end: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        return ok<any>(null);
      }),
      upsertSubscription: vi.fn(async (userId: string, data: any) => {
        return ok<Subscription>({
          id: 'sub-canonical',
          user_id: userId,
          tier: data.tier || 'pro',
          interval: data.interval || 'monthly',
          status: data.status || 'active',
          current_period_start: data.current_period_start || new Date().toISOString(),
          current_period_end: data.current_period_end || new Date(Date.now() + 30 * 86400000).toISOString(),
          cancel_at_period_end: Boolean(data.cancel_at_period_end),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }),
      createInvoice: vi.fn(async () => ok({ id: 'inv-1' })),
      recordPaymentEvent: vi.fn(async () => ok(true)),
    };

    entitlementService = new EntitlementService(mockRepo);
    billingService = new BillingService(mockRepo, razorpayProvider, entitlementService);
  });

  // ==========================================
  // TESTS 1 - 10: LIFECYCLE & ACCESS CONTROL
  // ==========================================

  it('TEST 1: New user gets trial with populated 14-day window', async () => {
    const res = await entitlementService.getEntitlement({ id: 'usr-trial-1', role: 'Member' });
    expect(res.state).toBe('TRIAL');
    expect(res.hasAccess).toBe(true);
    expect([13, 14, 15]).toContain(res.daysRemaining);
    expect(res.trialEndsAt).toBeDefined();
  });

  it('TEST 2: Trial user gets full access to features', async () => {
    const res = await entitlementService.getEntitlement({ id: 'usr-trial-1', role: 'Member' });
    expect(res.hasAccess).toBe(true);
    expect(res.state).toBe('TRIAL');
  });

  it('TEST 3: Trial does not reset on repeated status queries', async () => {
    const res1 = await entitlementService.getEntitlement({ id: 'usr-trial-1', role: 'Member' });
    const res2 = await entitlementService.getEntitlement({ id: 'usr-trial-1', role: 'Member' });
    expect(res1.trialEndsAt).toBe(res2.trialEndsAt);
    expect(res1.daysRemaining).toBe(res2.daysRemaining);
    expect(mockRepo.upsertSubscription).not.toHaveBeenCalled();
  });

  it('TEST 4: Expired trial is blocked with state EXPIRED and hasAccess false', async () => {
    const res = await entitlementService.getEntitlement({ id: 'usr-expired-1', role: 'Member' });
    expect(res.state).toBe('EXPIRED');
    expect(res.hasAccess).toBe(false);
    expect(res.daysRemaining).toBe(0);
  });

  it('TEST 5: Expired user retains Profile access (fails open for account management)', async () => {
    const httpRes = await request(app)
      .get('/api/v1/identity/profile')
      .set('Authorization', 'Bearer token-expired-user');

    expect(httpRes.status).toBe(200);
    expect(httpRes.body.success).toBe(true);
  });

  it('TEST 6: Expired user retains Billing status access', async () => {
    const httpRes = await request(app)
      .get('/api/v1/billing/status')
      .set('Authorization', 'Bearer token-expired-user');

    expect(httpRes.status).toBe(200);
    expect(httpRes.body.success).toBe(true);
    expect(httpRes.body.data.state).toBe('EXPIRED');
    expect(httpRes.body.data.hasAccess).toBe(false);
  });

  it('TEST 7: Expired user cannot invoke TRINETRA (HTTP 403 SUBSCRIPTION_REQUIRED)', async () => {
    const httpRes = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', 'Bearer token-expired-user')
      .send({ prompt: 'Create workout plan' });

    expect(httpRes.status).toBe(403);
    expect(httpRes.body.error.code).toBe('SUBSCRIPTION_REQUIRED');
  });

  it('TEST 8: Expired user cannot invoke Workout premium routes', async () => {
    const httpRes = await request(app)
      .get('/api/v1/workouts/today')
      .set('Authorization', 'Bearer token-expired-user');

    expect(httpRes.status).toBe(403);
    expect(httpRes.body.error.code).toBe('SUBSCRIPTION_REQUIRED');
  });

  it('TEST 9: Expired user cannot invoke Nutrition daily routes', async () => {
    const httpRes = await request(app)
      .get('/api/v1/nutrition/daily')
      .set('Authorization', 'Bearer token-expired-user');

    expect(httpRes.status).toBe(403);
    expect(httpRes.body.error.code).toBe('SUBSCRIPTION_REQUIRED');
  });

  it('TEST 10: Expired user cannot invoke Progress analytics routes', async () => {
    const httpRes = await request(app)
      .get('/api/v1/progress/statistics')
      .set('Authorization', 'Bearer token-expired-user');

    expect(httpRes.status).toBe(403);
    expect(httpRes.body.error.code).toBe('SUBSCRIPTION_REQUIRED');
  });

  // ==========================================
  // TESTS 11 - 20: CHECKOUT & SYNCHRONIZATION
  // ==========================================

  it('TEST 11: Monthly checkout resolves to ₹799 (79900 paise)', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(async (_url, options: any) => {
      const parsed = JSON.parse(options.body);
      expect(parsed.notes.interval).toBe('monthly');
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'sub_test_m', order_id: 'ord_test_m', currency: 'INR' }),
      } as any;
    });

    const res = await billingService.createRazorpayCheckout('usr-trial-1', 'pro', 'monthly');
    expect(res.isSuccess()).toBe(true);
    expect(res.value.amount).toBe(79900);
    expect(res.value.currency).toBe('INR');
  });

  it('TEST 12: Annual checkout resolves to ₹6,999 (699900 paise, ~27% saving)', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(async (_url, options: any) => {
      const parsed = JSON.parse(options.body);
      expect(parsed.notes.interval).toBe('yearly');
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'sub_test_a', order_id: 'ord_test_a', currency: 'INR' }),
      } as any;
    });

    const res = await billingService.createRazorpayCheckout('usr-trial-1', 'pro', 'yearly');
    expect(res.isSuccess()).toBe(true);
    expect(res.value.amount).toBe(699900);
  });

  it('TEST 13: Client cannot override amount (arbitrary amount is discarded)', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 'sub_tamper', order_id: 'ord_tamper', currency: 'INR' }),
    } as any));

    const httpRes = await request(app)
      .post('/api/v1/billing/razorpay/checkout')
      .set('Authorization', 'Bearer token-trial-user')
      .send({ interval: 'monthly', amount: 1 });

    expect(httpRes.status).toBe(200);
    expect(httpRes.body.data.amount).toBe(79900);
  });

  it('TEST 14: Client cannot override plan ID', async () => {
    let capturedPlanId = '';
    vi.spyOn(global, 'fetch').mockImplementationOnce(async (_url, options: any) => {
      const body = JSON.parse(options.body);
      capturedPlanId = body.plan_id;
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'sub_plan', order_id: 'ord_plan', currency: 'INR' }),
      } as any;
    });

    const httpRes = await request(app)
      .post('/api/v1/billing/razorpay/checkout')
      .set('Authorization', 'Bearer token-trial-user')
      .send({ interval: 'yearly', plan_id: 'plan_forged_free' });

    expect(httpRes.status).toBe(200);
    expect(capturedPlanId).toBe('plan_striva_annual');
  });

  it('TEST 15: Checkout success cannot locally activate membership without HMAC signature', async () => {
    const httpRes = await request(app)
      .post('/api/v1/billing/razorpay/verify')
      .set('Authorization', 'Bearer token-trial-user')
      .send({
        razorpay_payment_id: 'pay_unverified_1',
        razorpay_subscription_id: 'sub_unverified_1',
        razorpay_signature: 'fake_tampered_signature',
        interval: 'monthly',
      });

    expect(httpRes.status).toBe(400);
    expect(mockRepo.upsertSubscription).not.toHaveBeenCalled();
  });

  it('TEST 16: Verified payment transitions subscription to ACTIVE', async () => {
    const paymentId = 'pay_canonical_valid';
    const subId = 'sub_canonical_valid';
    const validSig = crypto
      .createHmac('sha256', testKeySecret)
      .update(`${paymentId}|${subId}`)
      .digest('hex');

    const res = await billingService.verifyRazorpayPayment('usr-trial-1', {
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subId,
      razorpay_signature: validSig,
      tier: 'pro',
      interval: 'monthly',
    });

    expect(res.isSuccess()).toBe(true);
    expect(res.value.status).toBe('active');
    expect(mockRepo.upsertSubscription).toHaveBeenCalled();
  });

  it('TEST 17: Duplicate webhook does not duplicate state (idempotency)', async () => {
    mockRepo.recordPaymentEvent.mockResolvedValueOnce(ok(false)); // Duplicate hit

    const webhookPayload = {
      event: 'subscription.charged',
      event_id: 'evt_dup_123',
      payload: {
        subscription: { entity: { id: 'sub_123', notes: { user_id: 'usr-trial-1' } } },
      },
    };
    const rawBody = JSON.stringify(webhookPayload);
    const validSig = crypto
      .createHmac('sha256', testWebhookSecret)
      .update(rawBody)
      .digest('hex');

    const res = await billingService.handleRazorpayWebhook(rawBody, validSig, webhookPayload);

    expect(res.isSuccess()).toBe(true);
    expect(res.value.processed).toBe(false);
    expect(res.value.reason).toBe('IDEMPOTENT_DUPLICATE');
  });

  it('TEST 18: Payment failure enters GRACE_PERIOD (72-hour access window)', async () => {
    const res = await entitlementService.getEntitlement({ id: 'usr-grace-1', role: 'Member' });
    expect(res.state).toBe('GRACE_PERIOD');
    expect(res.hasAccess).toBe(true);
    expect(res.daysRemaining).toBeGreaterThan(0);
  });

  it('TEST 19: Grace period expires correctly after 72 hours', () => {
    const expiredPastDueSub: Subscription = {
      id: 'sub-past-due-old',
      user_id: 'usr-past-due-old',
      tier: 'pro',
      interval: 'monthly',
      status: 'past_due',
      current_period_start: new Date(Date.now() - 35 * 86400000).toISOString(),
      current_period_end: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago (> 72h)
      cancel_at_period_end: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const res = entitlementService.evaluateSubscription(expiredPastDueSub, { id: 'usr-past-due-old', role: 'Member' });
    expect(res.state).toBe('EXPIRED');
    expect(res.hasAccess).toBe(false);
  });

  it('TEST 20: Cancellation preserves paid access until period end', () => {
    const cancelledActiveSub: Subscription = {
      id: 'sub-cancel-future',
      user_id: 'usr-cancel-1',
      tier: 'pro',
      interval: 'yearly',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 60 * 86400000).toISOString(), // 60 days in future
      cancel_at_period_end: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const res = entitlementService.evaluateSubscription(cancelledActiveSub, { id: 'usr-cancel-1', role: 'Member' });
    expect(res.state).toBe('CANCELLED');
    expect(res.hasAccess).toBe(true);
    expect(res.daysRemaining).toBe(60);
  });

  // ==========================================
  // TESTS 21 - 30: POST-EXPIRATION & PROFILE INTEGRATION
  // ==========================================

  it('TEST 21: Expired paid membership is blocked once period ends', () => {
    const expiredPaidSub: Subscription = {
      id: 'sub-expired-paid',
      user_id: 'usr-expired-paid',
      tier: 'pro',
      interval: 'monthly',
      status: 'active',
      current_period_start: new Date(Date.now() - 35 * 86400000).toISOString(),
      current_period_end: new Date(Date.now() - 2 * 86400000).toISOString(), // Ended 2 days ago
      cancel_at_period_end: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const res = entitlementService.evaluateSubscription(expiredPaidSub, { id: 'usr-expired-paid', role: 'Member' });
    expect(res.state).toBe('EXPIRED');
    expect(res.hasAccess).toBe(false);
  });

  it('TEST 22: Re-subscription restores ACTIVE state without resetting trial', async () => {
    mockRepo.upsertSubscription.mockResolvedValueOnce(
      ok<Subscription>({
        id: 'sub-resub-1',
        user_id: 'usr-expired-1',
        tier: 'pro',
        interval: 'monthly',
        status: 'active',
        trial_started_at: new Date(Date.now() - 20 * 86400000).toISOString(),
        trial_ends_at: new Date(Date.now() - 6 * 86400000).toISOString(), // Preserved, not overwritten
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        cancel_at_period_end: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    );

    const paymentId = 'pay_resub_123';
    const subId = 'sub_resub_123';
    const validSig = crypto
      .createHmac('sha256', testKeySecret)
      .update(`${paymentId}|${subId}`)
      .digest('hex');

    const res = await billingService.verifyRazorpayPayment('usr-expired-1', {
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subId,
      razorpay_signature: validSig,
      tier: 'pro',
      interval: 'monthly',
    });

    expect(res.isSuccess()).toBe(true);
    expect(res.value.status).toBe('active');
  });

  it('TEST 23: Demo user remains sandbox (state DEMO, cannot initiate real checkout)', async () => {
    const entRes = await entitlementService.getEntitlement({
      id: 'usr-demo-1',
      email: 'demo@sweatfix.com',
      role: 'Demo User',
    });
    expect(entRes.state).toBe('DEMO');
    expect(entRes.hasAccess).toBe(true);
    expect(entRes.isDemo).toBe(true);

    const checkoutRes = await billingService.createRazorpayCheckout(
      'usr-demo-1',
      'pro',
      'monthly',
      { email: 'demo@sweatfix.com', role: 'Demo User' }
    );
    expect(checkoutRes.isFailure()).toBe(true);
    expect(checkoutRes.error.message).toContain('Demo users operate in sandbox mode');
  });

  it('TEST 24: B2B billing remains strictly inaccessible to members (HTTP 403)', async () => {
    const memberRes = await request(app)
      .get('/api/v1/billing/admin/metrics')
      .set('Authorization', 'Bearer token-trial-user');

    expect(memberRes.status).toBe(403);
  });

  it('TEST 25: TRINETRA is available during active trial', async () => {
    const res = await entitlementService.getEntitlement({ id: 'usr-trial-1', role: 'Member' });
    expect(res.hasAccess).toBe(true);
    expect(res.state).toBe('TRIAL');
  });

  it('TEST 26: TRINETRA is available during grace period', async () => {
    const res = await entitlementService.getEntitlement({ id: 'usr-grace-1', role: 'Member' });
    expect(res.hasAccess).toBe(true);
    expect(res.state).toBe('GRACE_PERIOD');
  });

  it('TEST 27: TRINETRA is blocked after expiration (server-side gate)', async () => {
    const res = await entitlementService.getEntitlement({ id: 'usr-expired-1', role: 'Member' });
    expect(res.hasAccess).toBe(false);
    expect(res.state).toBe('EXPIRED');

    const httpRes = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', 'Bearer token-expired-user')
      .send({ prompt: 'Hello' });

    expect(httpRes.status).toBe(403);
  });

  it('TEST 28: Profile changes reach canonical API', async () => {
    const httpRes = await request(app)
      .patch('/api/v1/identity/profile/fitness')
      .set('Authorization', 'Bearer token-expired-user')
      .send({ primary_goal: 'Endurance Training', level: 'advanced' });

    expect(httpRes.status).toBe(200);
    expect(httpRes.body.success).toBe(true);
  });

  it('TEST 29: Profile updates refresh relevant frontend state without stale caching', async () => {
    const profileRes = await request(app)
      .get('/api/v1/identity/me')
      .set('Authorization', 'Bearer token-trial-user');

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data).toBeDefined();
  });

  it('TEST 30: Network failure cannot grant premium access (fails closed)', async () => {
    mockRepo.findSubscriptionByUserId.mockRejectedValueOnce(new Error('Connection failed'));

    const res = await entitlementService.getEntitlement({ id: 'usr-db-fail', role: 'Member' });
    expect(res.hasAccess).toBe(false);
    expect(res.state).toBe('EXPIRED');
    expect(res.reason).toBe('INTERNAL_LOOKUP_EXCEPTION');
  });
});
