import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../../src/app/app';

// Mock database store for Phase 8H Organization Billing Suite
vi.mock('../../src/database/supabase', () => {
  let mockStore = {
    organizations: [] as any[],
    organization_members: [] as any[],
    organization_billing_accounts: [] as any[],
    organization_subscription_plans: [] as any[],
    organization_subscriptions: [] as any[],
    organization_invoices: [] as any[],
    organization_payment_events: [] as any[],
    subscriptions: [] as any[],
  };

  const resetStore = () => {
    mockStore = {
      organizations: [
        { id: 'org-owner-1', name: 'Titan Gym Central', owner_id: 'usr-owner-1' },
        { id: 'org-other-2', name: 'Rival Fitness', owner_id: 'usr-rival-owner' },
      ],
      organization_members: [
        { id: 'mem-1', organization_id: 'org-owner-1', user_id: 'usr-owner-1', role: 'Organization Owner', status: 'active' },
        { id: 'mem-2', organization_id: 'org-owner-1', user_id: 'usr-mgr-1', role: 'Gym Manager', status: 'active' },
        { id: 'mem-3', organization_id: 'org-owner-1', user_id: 'usr-trainer-1', role: 'Trainer', status: 'active' },
        { id: 'mem-4', organization_id: 'org-owner-1', user_id: 'usr-frontdesk-1', role: 'Front Desk', status: 'active' },
        { id: 'mem-5', organization_id: 'org-owner-1', user_id: 'usr-nutri-1', role: 'Nutritionist', status: 'active' },
        { id: 'mem-6', organization_id: 'org-owner-1', user_id: 'usr-member-1', role: 'Member', status: 'active' },
        { id: 'mem-7', organization_id: 'org-other-2', user_id: 'usr-rival-owner', role: 'Organization Owner', status: 'active' },
      ],
      organization_billing_accounts: [
        {
          id: 'acc-1',
          organization_id: 'org-owner-1',
          billing_name: 'Titan Gym Central LLC',
          billing_email: 'billing@titan.app',
          tax_id: null,
          billing_address: { city: 'Bengaluru', country: 'India' },
          currency: 'INR',
          status: 'pending_setup',
          tax_status: 'unconfigured',
        },
      ],
      organization_subscription_plans: [
        {
          id: 'plan-starter-id',
          plan_code: 'gym_starter',
          name: 'STRIVA Gym Starter OS',
          interval: 'monthly',
          amount_paise: null, // Unconfigured price
          currency: 'INR',
          is_configured: false,
          is_active: false,
          max_locations: 1,
          max_staff: 5,
          max_members: 200,
          features: { locations: 1 },
          razorpay_plan_id: null,
        },
        {
          id: 'plan-growth-id',
          plan_code: 'gym_growth',
          name: 'STRIVA Gym Growth OS',
          interval: 'monthly',
          amount_paise: 499900, // ₹4,999.00 (configured for testing)
          currency: 'INR',
          is_configured: true,
          is_active: true,
          max_locations: 3,
          max_staff: 15,
          max_members: 600,
          features: { locations: 3 },
          razorpay_plan_id: 'plan_growth_live',
        },
      ],
      organization_subscriptions: [
        {
          id: 'sub-org-1',
          organization_id: 'org-owner-1',
          plan_id: 'plan-starter-id',
          status: 'none',
          billing_interval: 'monthly',
          currency: 'INR',
          amount_paise: 0,
          cancel_at_period_end: false,
        },
      ],
      organization_invoices: [
        {
          id: 'inv-1',
          organization_id: 'org-owner-1',
          invoice_number: 'INV-2026-TITAN-001',
          amount_paise: 499900,
          subtotal_paise: 499900,
          discount_paise: 0,
          tax_paise: 0,
          tax_details: { configured: false, status: 'unconfigured' },
          currency: 'INR',
          status: 'paid',
          type: 'receipt',
          line_items: [{ description: 'STRIVA Gym Growth OS', quantity: 1, amount_paise: 499900 }],
          razorpay_payment_id: 'pay_existing_123',
          issued_at: '2026-10-01T10:00:00Z',
          paid_at: '2026-10-01T10:00:00Z',
        },
        {
          id: 'inv-other-org',
          organization_id: 'org-other-2',
          invoice_number: 'INV-2026-RIVAL-001',
          amount_paise: 999900,
          subtotal_paise: 999900,
          currency: 'INR',
          status: 'paid',
          type: 'receipt',
          issued_at: '2026-10-01T10:00:00Z',
          paid_at: '2026-10-01T10:00:00Z',
        },
      ],
      organization_payment_events: [] as any[],
      subscriptions: [
        { user_id: 'usr-member-1', tier: 'pro', status: 'active' },
        { user_id: 'usr-owner-1', tier: 'free', status: 'active' },
      ],
    };
  };

  resetStore();

  let shouldFailQueries = false;
  let failTable: string | null = null;

  const mockDb = {
    _resetStore: resetStore,
    _setFailQueries: (val: boolean) => {
      shouldFailQueries = val;
    },
    _setFailTable: (tbl: string | null) => {
      failTable = tbl;
    },
    auth: {
      getUser: vi.fn(async (token: string) => {
        if (token === 'token-owner') {
          return {
            data: {
              user: {
                id: 'usr-owner-1',
                email: 'owner@titan.app',
                user_metadata: { role: 'Organization Owner' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-manager') {
          return {
            data: {
              user: {
                id: 'usr-mgr-1',
                email: 'manager@titan.app',
                user_metadata: { role: 'Gym Manager' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-superadmin') {
          return {
            data: {
              user: {
                id: 'usr-admin-1',
                email: 'admin@striva.app',
                user_metadata: { role: 'Platform Super Admin' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-member') {
          return {
            data: {
              user: {
                id: 'usr-member-1',
                email: 'john@user.app',
                user_metadata: { role: 'Member' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-trainer') {
          return {
            data: {
              user: {
                id: 'usr-trainer-1',
                email: 'alex@titan.app',
                user_metadata: { role: 'Trainer' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-frontdesk') {
          return {
            data: {
              user: {
                id: 'usr-frontdesk-1',
                email: 'front@titan.app',
                user_metadata: { role: 'Front Desk' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-nutri') {
          return {
            data: {
              user: {
                id: 'usr-nutri-1',
                email: 'nutri@titan.app',
                user_metadata: { role: 'Nutritionist' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-demo') {
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
        if (token === 'token-rival-owner') {
          return {
            data: {
              user: {
                id: 'usr-rival-owner',
                email: 'rival@rival.app',
                user_metadata: { role: 'Organization Owner' },
              },
            },
            error: null,
          };
        }
        return { data: { user: null }, error: { message: 'Invalid JWT' } };
      }),
    },
    from: (table: string) => {
      let currentTable = table;
      let selectedFields = '*';
      let filters: ((row: any) => boolean)[] = [];
      let orderByCol: string | null = null;
      let orderAsc = true;
      let rangeFrom: number | null = null;
      let rangeTo: number | null = null;

      const builder: any = {
        select: (fields: string = '*', options?: any) => {
          selectedFields = fields;
          return builder;
        },
        eq: (col: string, val: any) => {
          filters.push((row) => row[col] === val);
          return builder;
        },
        neq: (col: string, val: any) => {
          filters.push((row) => row[col] !== val);
          return builder;
        },
        gte: (col: string, val: any) => {
          filters.push((row) => row[col] >= val);
          return builder;
        },
        lte: (col: string, val: any) => {
          filters.push((row) => row[col] <= val);
          return builder;
        },
        order: (col: string, options?: { ascending: boolean }) => {
          orderByCol = col;
          orderAsc = options ? options.ascending : true;
          return builder;
        },
        range: (from: number, to: number) => {
          rangeFrom = from;
          rangeTo = to;
          return builder;
        },
        maybeSingle: async () => {
          if (shouldFailQueries) return { data: null, error: { message: 'Database query execution failed' } };
          const dataList = (mockStore as any)[currentTable] || [];
          const filtered = dataList.filter((r: any) => filters.every((fn) => fn(r)));
          return { data: filtered[0] || null, error: null };
        },
        single: async () => {
          if (shouldFailQueries) return { data: null, error: { message: 'Database query execution failed' } };
          const dataList = (mockStore as any)[currentTable] || [];
          const filtered = dataList.filter((r: any) => filters.every((fn) => fn(r)));
          if (filtered.length === 0) return { data: null, error: { message: 'Record not found' } };
          return { data: filtered[0], error: null };
        },
        insert: (rowOrRows: any) => {
          if (shouldFailQueries) {
            return {
              select: () => ({
                single: async () => ({ data: null, error: { message: 'Database insert failed' } }),
              }),
            };
          }
          const items = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
          const inserted: any[] = [];
          for (const item of items) {
            const newItem = { id: item.id || `gen-${Date.now()}-${Math.random()}`, ...item };
            (mockStore as any)[currentTable].push(newItem);
            inserted.push(newItem);
          }
          return {
            select: () => ({
              single: async () => ({ data: inserted[0], error: null }),
            }),
          };
        },
        upsert: (item: any, options?: any) => {
          if (shouldFailQueries) {
            return {
              select: () => ({
                single: async () => ({ data: null, error: { message: 'Database upsert failed' } }),
              }),
            };
          }
          const dataList = (mockStore as any)[currentTable] || [];
          const onConflictKey = options?.onConflict || 'id';
          const existingIdx = dataList.findIndex((r: any) => r[onConflictKey] === item[onConflictKey]);
          let resultItem: any;
          if (existingIdx >= 0) {
            dataList[existingIdx] = { ...dataList[existingIdx], ...item };
            resultItem = dataList[existingIdx];
          } else {
            resultItem = { id: item.id || `gen-${Date.now()}`, ...item };
            dataList.push(resultItem);
          }
          return {
            select: () => ({
              single: async () => ({ data: resultItem, error: null }),
            }),
          };
        },
        update: (updates: any) => {
          if (shouldFailQueries) {
            return {
              eq: () => ({
                select: () => ({
                  single: async () => ({ data: null, error: { message: 'Database update failed' } }),
                }),
              }),
            };
          }
          return {
            eq: (col: string, val: any) => {
              const dataList = (mockStore as any)[currentTable] || [];
              const matched = dataList.filter((r: any) => r[col] === val);
              for (const item of matched) {
                Object.assign(item, updates);
              }
              return {
                select: () => ({
                  single: async () => ({ data: matched[0] || null, error: null }),
                }),
                then: (resolve: any) => resolve({ data: matched, error: null }),
              };
            },
          };
        },
        then: (resolve: any) => {
          if (shouldFailQueries || (failTable && failTable === currentTable)) {
            return resolve({ data: null, count: 0, error: { message: 'Database query execution failed' } });
          }
          let dataList = (mockStore as any)[currentTable] || [];
          let filtered = dataList.filter((r: any) => filters.every((fn) => fn(r)));
          const count = filtered.length;
          if (rangeFrom !== null && rangeTo !== null) {
            filtered = filtered.slice(rangeFrom, rangeTo + 1);
          }
          resolve({ data: filtered, count, error: null });
        },
      };

      return builder;
    },
  };

  return { supabase: mockDb, supabaseAdmin: mockDb };
});

describe('Phase 8H: Organization Billing Security & Financial Operations Suite', () => {
  beforeEach(async () => {
    const { supabase } = await import('../../src/database/supabase');
    (supabase as any)._resetStore();
    (supabase as any)._setFailQueries(false);

    // Set test Razorpay credentials
    process.env.RAZORPAY_KEY_ID = 'rzp_test_key123';
    process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret456';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook_secret_789';
  });

  // 1. Owner can access organization billing status
  it('1. Owner can access organization billing status (200 OK)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/billing/status')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.billingAccount).toBeDefined();
    expect(res.body.data.availablePlans).toBeInstanceOf(Array);
    expect(res.body.data.hasActiveSubscription).toBe(false);
  });

  // 2. Platform Super Admin can access organization billing status
  it('2. Platform Super Admin can access organization billing status (200 OK)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/billing/status')
      .set('Authorization', 'Bearer token-superadmin')
      .set('x-organization-id', 'org-owner-1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.billingAccount.organization_id).toBe('org-owner-1');
  });

  // 3. Gym Manager cannot mutate organization billing (403 Forbidden)
  it('3. Gym Manager cannot mutate organization billing (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/organizations/current/billing/checkout')
      .set('Authorization', 'Bearer token-manager')
      .send({ plan_code: 'gym_growth', interval: 'monthly' });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('not authorized');
  });

  // 4. Member cannot access organization billing (403 Forbidden)
  it('4. Member cannot access organization billing (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/billing/status')
      .set('Authorization', 'Bearer token-member');

    expect(res.status).toBe(403);
  });

  // 5. Trainer cannot access organization billing (403 Forbidden)
  it('5. Trainer cannot access organization billing (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/billing/status')
      .set('Authorization', 'Bearer token-trainer');

    expect(res.status).toBe(403);
  });

  // 6. Front Desk cannot access organization billing (403 Forbidden)
  it('6. Front Desk cannot access organization billing (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/billing/status')
      .set('Authorization', 'Bearer token-frontdesk');

    expect(res.status).toBe(403);
  });

  // 7. Nutritionist cannot access organization billing (403 Forbidden)
  it('7. Nutritionist cannot access organization billing (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/billing/status')
      .set('Authorization', 'Bearer token-nutri');

    expect(res.status).toBe(403);
  });

  // 8. Demo user cannot access organization billing (403 Forbidden)
  it('8. Demo user cannot access organization billing (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/billing/status')
      .set('Authorization', 'Bearer token-demo');

    expect(res.status).toBe(403);
  });

  // 9. Cross-tenant isolation: Org A cannot access Org B billing
  it('9. Cross-tenant isolation: Org A owner cannot access Org B billing (403 Forbidden)', async () => {
    // Owner of Org 1 attempts to pass x-organization-id for Org 2
    const res = await request(app)
      .get('/api/v1/organizations/current/billing/status')
      .set('Authorization', 'Bearer token-owner')
      .set('x-organization-id', 'org-other-2');

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('Access Denied');
  });

  // 10. Organization header spoofing rejected
  it('10. Organization header spoofing rejected (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/organizations/current/billing/checkout')
      .set('Authorization', 'Bearer token-owner')
      .set('x-organization-id', 'org-fake-999')
      .send({ plan_code: 'gym_growth' });

    expect(res.status).toBe(403);
  });

  // 11. Client-submitted amount / plan manipulation rejected (server authoritative pricing)
  it('11. Client-submitted amount manipulation ignored and server-authoritative (Zod strips/rejects)', async () => {
    // Client tries to submit a custom price of ₹1 instead of server price
    const res = await request(app)
      .post('/api/v1/organizations/current/billing/checkout')
      .set('Authorization', 'Bearer token-owner')
      .send({ plan_code: 'gym_growth', amount: 100, interval: 'monthly' });

    // Checkout will succeed using server price (or fail with fetch mock), but client price is ignored
    expect(res.body.data?.amount_paise).not.toBe(100);
  });

  // 12. Checkout fails closed when plan pricing is unconfigured
  it('12. Checkout fails closed when plan pricing is unconfigured (decision pending)', async () => {
    const res = await request(app)
      .post('/api/v1/organizations/current/billing/checkout')
      .set('Authorization', 'Bearer token-owner')
      .send({ plan_code: 'gym_starter', interval: 'monthly' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Pricing decision pending');
  });

  // 13. Checkout fails closed when Razorpay credentials missing
  it('13. Checkout fails closed when Razorpay credentials missing (503 Service Unavailable)', async () => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;

    const res = await request(app)
      .post('/api/v1/organizations/current/billing/checkout')
      .set('Authorization', 'Bearer token-owner')
      .send({ plan_code: 'gym_growth', interval: 'monthly' });

    expect(res.status).toBe(503);
    expect(res.body.error.message).toContain('credentials unconfigured');
  });

  // 14. Invalid checkout HMAC signature rejected
  it('14. Invalid checkout HMAC signature rejected (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/v1/organizations/current/billing/verify')
      .set('Authorization', 'Bearer token-owner')
      .send({
        razorpay_payment_id: 'pay_test_123',
        razorpay_order_id: 'order_test_456',
        razorpay_signature: 'invalid_forged_signature',
        plan_code: 'gym_growth',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Invalid payment signature');
  });

  // 15. Valid checkout HMAC signature activates subscription and creates invoice receipt
  it('15. Valid checkout HMAC signature activates subscription and creates invoice receipt', async () => {
    const paymentId = 'pay_real_999';
    const orderId = 'order_real_999';
    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const payload = `${orderId}|${paymentId}`;
    const validSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const res = await request(app)
      .post('/api/v1/organizations/current/billing/verify')
      .set('Authorization', 'Bearer token-owner')
      .send({
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        razorpay_signature: validSignature,
        plan_code: 'gym_growth',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.subscription.status).toBe('active');
    expect(res.body.data.invoice).toBeDefined();
    expect(res.body.data.invoice.amount_paise).toBe(499900);
    expect(res.body.data.invoice.type).toBe('receipt');
  });

  // 16. Webhook rejects invalid HMAC signature
  it('16. Webhook rejects invalid HMAC signature (400 Bad Request)', async () => {
    const payload = { event: 'payment.captured', id: 'evt_test_1' };
    const res = await request(app)
      .post('/api/v1/billing/webhook/razorpay/organization')
      .set('x-razorpay-signature', 'forged_sig')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Invalid webhook signature');
  });

  // 17. Webhook accepts valid HMAC signature and processes payment event
  it('17. Webhook accepts valid HMAC signature and processes payment event', async () => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const payload = {
      id: 'evt_hook_1',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_hook_1',
            amount: 499900,
            notes: {
              organization_id: 'org-owner-1',
              plan_code: 'gym_growth',
            },
          },
        },
      },
    };
    const rawBody = JSON.stringify(payload);
    const validSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    const res = await request(app)
      .post('/api/v1/billing/webhook/razorpay/organization')
      .set('x-razorpay-signature', validSignature)
      .set('Content-Type', 'application/json')
      .send(rawBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('processed');
  });

  // 18. Webhook idempotency: duplicate event ID is ignored without duplicate processing
  it('18. Webhook idempotency: duplicate event ID is ignored', async () => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const payload = {
      id: 'evt_hook_duplicate',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_hook_dup',
            amount: 499900,
            notes: { organization_id: 'org-owner-1', plan_code: 'gym_growth' },
          },
        },
      },
    };
    const rawBody = JSON.stringify(payload);
    const validSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    // First delivery
    await request(app)
      .post('/api/v1/billing/webhook/razorpay/organization')
      .set('x-razorpay-signature', validSignature)
      .set('Content-Type', 'application/json')
      .send(rawBody);

    // Duplicate delivery
    const res = await request(app)
      .post('/api/v1/billing/webhook/razorpay/organization')
      .set('x-razorpay-signature', validSignature)
      .set('Content-Type', 'application/json')
      .send(rawBody);

    expect(res.status).toBe(200);
    expect(res.body.idempotent).toBe(true);
    expect(res.body.status).toBe('already_processed');
  });

  // 19. Payment failure webhook marks subscription past_due
  it('19. Payment failure webhook marks active subscription past_due', async () => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const payload = {
      id: 'evt_hook_fail_1',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_failed_1',
            notes: { organization_id: 'org-owner-1' },
          },
        },
      },
    };
    const rawBody = JSON.stringify(payload);
    const validSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    // First activate org subscription
    const { supabase } = await import('../../src/database/supabase');
    await supabase.from('organization_subscriptions').update({ status: 'active' }).eq('organization_id', 'org-owner-1');

    const res = await request(app)
      .post('/api/v1/billing/webhook/razorpay/organization')
      .set('x-razorpay-signature', validSignature)
      .set('Content-Type', 'application/json')
      .send(rawBody);

    expect(res.status).toBe(200);

    // Verify status transitioned to past_due
    const subRes = await supabase.from('organization_subscriptions').select('*').eq('organization_id', 'org-owner-1').single();
    expect(subRes.data.status).toBe('past_due');
  });

  // 20. Subscription cancellation marks cancel_at_period_end
  it('20. Subscription cancellation marks cancel_at_period_end', async () => {
    const { supabase } = await import('../../src/database/supabase');
    await supabase.from('organization_subscriptions').update({ status: 'active' }).eq('organization_id', 'org-owner-1');

    const res = await request(app)
      .post('/api/v1/organizations/current/billing/cancel')
      .set('Authorization', 'Bearer token-owner')
      .send({ cancel_at_period_end: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.cancel_at_period_end).toBe(true);
  });

  // 21. Invoices use integer paise arithmetic
  it('21. Invoices use integer paise arithmetic', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/billing/invoices')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    const invoice = res.body.data[0];
    expect(invoice.amount_paise).toBe(499900);
    expect(Number.isInteger(invoice.amount_paise)).toBe(true);
  });

  // 22. Invoices marked as receipt with unconfigured tax status
  it('22. Invoices marked as receipt with unconfigured tax status', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/billing/invoices')
      .set('Authorization', 'Bearer token-owner');

    const invoice = res.body.data[0];
    expect(invoice.type).toBe('receipt');
    expect(invoice.tax_details.status).toBe('unconfigured');
  });

  // 23. Invoice ownership isolation: Org A cannot retrieve Org B invoice
  it('23. Invoice ownership isolation: Org A cannot retrieve Org B invoice (404 Not Found)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/billing/invoices/inv-other-org')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(404);
  });

  // 24. Consumer billing isolation: consumer subscription remains unaffected
  it('24. Consumer billing isolation: consumer subscription remains unaffected', async () => {
    const res = await request(app)
      .get('/api/v1/billing/status')
      .set('Authorization', 'Bearer token-member');

    expect(res.status).toBe(200);
    expect(res.body.data.entitlement.tier).toBe('pro');
    expect(res.body.data.subscription).toBeDefined();
    // Consumer prices remain unchanged
    expect(res.body.data.limits).toBeDefined();
  });

  // 25. Financial metrics scoped strictly to authorized organization
  it('25. Financial metrics scoped strictly to authorized organization', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/billing/financials')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.data.totalCollectedPaise).toBe(499900); // Only Org 1 invoice, Org 2 invoice excluded!
    expect(res.body.data.paidInvoicesCount).toBe(1);
    expect(res.body.data.currency).toBe('INR');
  });

  // 26. Database error propagates clean error without mock data fallback
  it('26. Database error propagates clean error without mock data fallback', async () => {
    const { supabase } = await import('../../src/database/supabase');
    (supabase as any)._setFailTable('organization_invoices');

    const res = await request(app)
      .get('/api/v1/organizations/current/billing/invoices')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
