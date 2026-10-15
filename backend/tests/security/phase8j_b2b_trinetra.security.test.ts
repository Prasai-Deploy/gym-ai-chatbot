import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app/app';
import { ToolPermissionEngine } from '../../src/modules/ai/safety/ToolPermissionEngine';
import { b2bToolRegistry } from '../../src/modules/ai/advisor/orgAdvisor.routes';
import {
  GetOrganizationOverviewTool,
  GetMemberSummaryTool,
  GetAttendanceSummaryTool,
  GetTrainerAssignmentsTool,
  GetRetentionSummaryTool,
  GetAttentionItemsTool,
  GetOrganizationBillingStatusTool,
} from '../../src/modules/ai/tools/impl/B2BTrinetraTools';

// Mock database store for Phase 8J B2B TRINETRA Test Suite
vi.mock('../../src/database/supabase', () => {
  let mockStore = {
    organizations: [] as any[],
    organization_members: [] as any[],
    ai_conversations: [] as any[],
    ai_messages: [] as any[],
    ai_tool_executions: [] as any[],
    attendance_logs: [] as any[],
    trainer_member_assignments: [] as any[],
    organization_locations: [] as any[],
    organization_branding: [] as any[],
    organization_staff: [] as any[],
    organization_billing_accounts: [] as any[],
    organization_subscriptions: [] as any[],
    organization_subscription_plans: [] as any[],
    organization_invoices: [] as any[],
    organization_notifications: [] as any[],
    profiles: [] as any[],
    subscriptions: [] as any[],
  };

  const resetStore = () => {
    mockStore = {
      organizations: [
        { id: 'org-titan-1', name: 'Titan Gym Central', slug: 'titan-gym', owner_id: 'usr-owner-1', status: 'active' },
        { id: 'org-rival-2', name: 'Rival Fitness Club', slug: 'rival-fitness', owner_id: 'usr-rival-owner', status: 'active' },
      ],
      organization_members: [
        { id: 'mem-1', organization_id: 'org-titan-1', user_id: 'usr-owner-1', role: 'Organization Owner', status: 'active' },
        { id: 'mem-2', organization_id: 'org-titan-1', user_id: 'usr-mgr-1', role: 'Gym Manager', status: 'active' },
        { id: 'mem-3', organization_id: 'org-titan-1', user_id: 'usr-trainer-1', role: 'Trainer', status: 'active' },
        { id: 'mem-4', organization_id: 'org-titan-1', user_id: 'usr-frontdesk-1', role: 'Front Desk', status: 'active' },
        { id: 'mem-5', organization_id: 'org-titan-1', user_id: 'usr-nutri-1', role: 'Nutritionist', status: 'active' },
        { id: 'mem-6', organization_id: 'org-titan-1', user_id: 'usr-member-1', role: 'Member', status: 'active' },
        { id: 'mem-7', organization_id: 'org-titan-1', user_id: 'usr-member-2', role: 'Member', status: 'active' },
        { id: 'mem-8', organization_id: 'org-rival-2', user_id: 'usr-rival-owner', role: 'Organization Owner', status: 'active' },
      ],
      ai_conversations: [
        {
          id: 'conv-owner-titan',
          user_id: 'usr-owner-1',
          organization_id: 'org-titan-1',
          scope: 'organization_advisor',
          title: 'Titan Gym Business Intelligence',
          status: 'ACTIVE',
          created_at: '2026-10-01T10:00:00Z',
          updated_at: '2026-10-01T10:00:00Z',
        },
        {
          id: 'conv-consumer-owner',
          user_id: 'usr-owner-1',
          organization_id: null,
          scope: 'consumer',
          title: 'My Personal Bench Press Coach',
          status: 'ACTIVE',
          created_at: '2026-10-01T09:00:00Z',
          updated_at: '2026-10-01T09:00:00Z',
        },
        {
          id: 'conv-rival-owner',
          user_id: 'usr-rival-owner',
          organization_id: 'org-rival-2',
          scope: 'organization_advisor',
          title: 'Rival Fitness Confidential Session',
          status: 'ACTIVE',
          created_at: '2026-10-01T11:00:00Z',
          updated_at: '2026-10-01T11:00:00Z',
        },
      ],
      ai_messages: [
        {
          id: 'msg-1',
          conversation_id: 'conv-owner-titan',
          role: 'user',
          content: 'What is our member count?',
          created_at: '2026-10-01T10:01:00Z',
        },
        {
          id: 'msg-2',
          conversation_id: 'conv-owner-titan',
          role: 'assistant',
          content: 'Titan Gym Central has 2 active members.',
          created_at: '2026-10-01T10:02:00Z',
        },
      ],
      ai_tool_executions: [],
      attendance_logs: [
        {
          id: 'att-1',
          organization_id: 'org-titan-1',
          user_id: 'usr-member-1',
          check_in_time: new Date().toISOString(),
          status: 'active',
          duration_minutes: null,
        },
      ],
      trainer_member_assignments: [
        {
          id: 'asgn-1',
          organization_id: 'org-titan-1',
          trainer_user_id: 'usr-trainer-1',
          member_user_id: 'usr-member-1',
          status: 'active',
        },
      ],
      organization_locations: [
        {
          id: 'loc-1',
          organization_id: 'org-titan-1',
          name: 'Downtown Club',
          is_primary: true,
        },
      ],
      organization_branding: [
        {
          id: 'br-1',
          organization_id: 'org-titan-1',
          business_name: 'Titan Gym Central',
          theme_mode: 'dark',
          primary_color: '#F97316',
        },
      ],
      organization_staff: [],
      organization_billing_accounts: [
        {
          id: 'acc-titan',
          organization_id: 'org-titan-1',
          currency: 'INR',
          status: 'active',
        },
      ],
      organization_subscriptions: [
        {
          id: 'sub-titan',
          organization_id: 'org-titan-1',
          plan_id: 'plan-growth',
          status: 'active',
          billing_interval: 'monthly',
          currency: 'INR',
          amount_paise: 499900,
          plan: {
            id: 'plan-growth',
            plan_code: 'gym_growth',
            name: 'STRIVA Gym Growth OS',
          },
        },
      ],
      organization_subscription_plans: [
        {
          id: 'plan-growth',
          plan_code: 'gym_growth',
          name: 'STRIVA Gym Growth OS',
          interval: 'monthly',
          amount_paise: 499900,
          currency: 'INR',
          is_configured: true,
          is_active: true,
        },
      ],
      organization_invoices: [
        {
          id: 'inv-titan-1',
          organization_id: 'org-titan-1',
          invoice_number: 'INV-2026-TITAN-001',
          amount_paise: 499900,
          subtotal_paise: 499900,
          currency: 'INR',
          status: 'paid',
          type: 'receipt',
          issued_at: '2026-10-01T10:00:00Z',
          paid_at: '2026-10-01T10:00:00Z',
        },
      ],
      organization_notifications: [],
      profiles: [
        { id: 'usr-owner-1', full_name: 'Marcus Owner', email: 'owner@titan.app' },
        { id: 'usr-mgr-1', full_name: 'Sarah Manager', email: 'manager@titan.app' },
        { id: 'usr-trainer-1', full_name: 'Coach Alex', email: 'alex@titan.app' },
        { id: 'usr-member-1', full_name: 'John Lifter', email: 'john@titan.app' },
      ],
      subscriptions: [
        { user_id: 'usr-member-1', tier: 'pro', status: 'active' },
      ],
    };
  };

  resetStore();

  const mockDb = {
    _resetStore: resetStore,
    _getStore: () => mockStore,
    auth: {
      getUser: vi.fn(async (token: string) => {
        if (token === 'token-owner') {
          return {
            data: { user: { id: 'usr-owner-1', email: 'owner@titan.app', user_metadata: { role: 'Organization Owner' } } },
            error: null,
          };
        }
        if (token === 'token-manager') {
          return {
            data: { user: { id: 'usr-mgr-1', email: 'manager@titan.app', user_metadata: { role: 'Gym Manager' } } },
            error: null,
          };
        }
        if (token === 'token-superadmin') {
          return {
            data: { user: { id: 'usr-super-1', email: 'super@striva.app', user_metadata: { role: 'Platform Super Admin' } } },
            error: null,
          };
        }
        if (token === 'token-trainer') {
          return {
            data: { user: { id: 'usr-trainer-1', email: 'alex@titan.app', user_metadata: { role: 'Trainer' } } },
            error: null,
          };
        }
        if (token === 'token-frontdesk') {
          return {
            data: { user: { id: 'usr-frontdesk-1', email: 'reception@titan.app', user_metadata: { role: 'Front Desk' } } },
            error: null,
          };
        }
        if (token === 'token-nutri') {
          return {
            data: { user: { id: 'usr-nutri-1', email: 'nutrition@titan.app', user_metadata: { role: 'Nutritionist' } } },
            error: null,
          };
        }
        if (token === 'token-member') {
          return {
            data: { user: { id: 'usr-member-1', email: 'john@titan.app', user_metadata: { role: 'Member' } } },
            error: null,
          };
        }
        if (token === 'token-demo') {
          return {
            data: { user: { id: 'usr-demo-1', email: 'demo@sweatfix.com', user_metadata: { role: 'Demo User' } } },
            error: null,
          };
        }
        if (token === 'token-rival-owner') {
          return {
            data: { user: { id: 'usr-rival-owner', email: 'owner@rival.app', user_metadata: { role: 'Organization Owner' } } },
            error: null,
          };
        }
        return { data: { user: null }, error: new Error('Invalid token') };
      }),
    },
    from: vi.fn((table: string) => {
      let currentFilter: any = {};
      let gteFilter: any = {};
      let lteFilter: any = {};
      let isDeleteOp = false;

      const filterItem = (item: any) => {
        const eqMatch = Object.entries(currentFilter).every(([k, v]) => item[k] === v);
        if (!eqMatch) return false;
        for (const [k, v] of Object.entries(gteFilter)) {
          if (item[k] < (v as any)) return false;
        }
        for (const [k, v] of Object.entries(lteFilter)) {
          if (item[k] > (v as any)) return false;
        }
        return true;
      };

      const builder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn((payload: any) => {
          const arr = Array.isArray(payload) ? payload : [payload];
          const created = arr.map((item) => ({ id: item.id || `gen-${Date.now()}-${Math.random()}`, ...item }));
          (mockStore as any)[table]?.push(...created);
          return {
            select: () => ({
              single: async () => ({ data: created[0], error: null }),
            }),
            data: created,
            error: null,
          };
        }),
        update: vi.fn((payload: any) => {
          const list = (mockStore as any)[table] || [];
          const matches = list.filter((item: any) => filterItem(item));
          matches.forEach((item: any) => Object.assign(item, payload));
          return {
            eq: builder.eq,
            select: () => ({
              single: async () => ({ data: matches[0] || null, error: null }),
            }),
            data: matches,
            error: null,
          };
        }),
        upsert: vi.fn().mockReturnThis(),
        delete: vi.fn(() => {
          isDeleteOp = true;
          return builder;
        }),
        eq: vi.fn((col: string, val: any) => {
          currentFilter[col] = val;
          return builder;
        }),
        neq: vi.fn((col: string, val: any) => {
          // Exclude items matching this column and value
          return builder;
        }),
        gte: vi.fn((col: string, val: any) => {
          gteFilter[col] = val;
          return builder;
        }),
        lte: vi.fn((col: string, val: any) => {
          lteFilter[col] = val;
          return builder;
        }),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn(async () => {
          const list = (mockStore as any)[table] || [];
          const found = list.find((item: any) => filterItem(item));
          return { data: found || null, error: found ? null : new Error('Not found') };
        }),
        maybeSingle: vi.fn(async () => {
          const list = (mockStore as any)[table] || [];
          const found = list.find((item: any) => filterItem(item));
          return { data: found || null, error: null };
        }),
        then: (resolve: any) => {
          if (isDeleteOp) {
            const list = (mockStore as any)[table] || [];
            (mockStore as any)[table] = list.filter((item: any) => !filterItem(item));
            return Promise.resolve({ error: null }).then(resolve);
          }
          const list = (mockStore as any)[table] || [];
          const filtered = list.filter((item: any) => filterItem(item));
          return Promise.resolve({ data: filtered, count: filtered.length, error: null }).then(resolve);
        },
      };

      return builder;
    }),
  };

  return { supabase: mockDb, supabaseAdmin: mockDb };
});

describe('STRIVA V2 — Phase 8J: B2B TRINETRA Gym Business Intelligence Suite', () => {
  beforeEach(async () => {
    const { supabase } = await import('../../src/database/supabase');
    (supabase as any)._resetStore();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)
  // ─────────────────────────────────────────────────────────────
  describe('1. Authentication, Tenancy & RBAC Enforcement', () => {
    it('allows Organization Owner access to B2B Advisor chat and conversations', async () => {
      const res = await request(app)
        .get('/api/v1/organizations/current/advisor/conversations')
        .set('Authorization', 'Bearer token-owner');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('allows Gym Manager access to B2B Advisor operational conversations', async () => {
      const res = await request(app)
        .get('/api/v1/organizations/current/advisor/conversations')
        .set('Authorization', 'Bearer token-manager');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('denies Trainer access to B2B Advisor (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/organizations/current/advisor/conversations')
        .set('Authorization', 'Bearer token-trainer');

      expect(res.status).toBe(403);
    });

    it('denies Front Desk access to B2B Advisor (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/organizations/current/advisor/conversations')
        .set('Authorization', 'Bearer token-frontdesk');

      expect(res.status).toBe(403);
    });

    it('denies Nutritionist access to B2B Advisor (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/organizations/current/advisor/conversations')
        .set('Authorization', 'Bearer token-nutri');

      expect(res.status).toBe(403);
    });

    it('denies Member access to B2B Advisor (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/organizations/current/advisor/conversations')
        .set('Authorization', 'Bearer token-member');

      expect(res.status).toBe(403);
    });

    it('denies Demo User access to B2B Advisor (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/organizations/current/advisor/conversations')
        .set('Authorization', 'Bearer token-demo');

      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated requests (401 Unauthorized)', async () => {
      const res = await request(app)
        .get('/api/v1/organizations/current/advisor/conversations');

      expect(res.status).toBe(401);
    });

    it('denies access when user attempts to spoof organization header for a gym they do not belong to', async () => {
      const res = await request(app)
        .get('/api/v1/organizations/current/advisor/conversations')
        .set('Authorization', 'Bearer token-owner')
        .set('x-organization-id', 'org-rival-2'); // Owner belongs to org-titan-1, not org-rival-2

      expect(res.status).toBe(403);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. CONVERSATION ISOLATION & DATA SECURITY
  // ─────────────────────────────────────────────────────────────
  describe('2. Conversation Isolation & Scope Protection', () => {
    it('isolates B2B Advisor conversations from Consumer TRINETRA conversation list', async () => {
      // Fetch consumer conversations for the owner user
      const resConsumer = await request(app)
        .get('/api/v1/ai/conversations')
        .set('Authorization', 'Bearer token-owner');

      expect(resConsumer.status).toBe(200);
      const consumerIds = resConsumer.body.data.map((c: any) => c.id);
      // Ensure the B2B conversation is NOT exposed in the consumer coach
      expect(consumerIds).not.toContain('conv-owner-titan');
      expect(consumerIds).toContain('conv-consumer-owner');
    });

    it('isolates Consumer conversations from B2B Advisor conversation list', async () => {
      const resAdvisor = await request(app)
        .get('/api/v1/organizations/current/advisor/conversations')
        .set('Authorization', 'Bearer token-owner');

      expect(resAdvisor.status).toBe(200);
      const advisorIds = resAdvisor.body.data.map((c: any) => c.id);
      expect(advisorIds).toContain('conv-owner-titan');
      expect(advisorIds).not.toContain('conv-consumer-owner');
    });

    it('prevents cross-tenant access to another organization\'s advisor conversations', async () => {
      // Owner of Titan Gym attempts to read Rival Fitness conversation history
      const res = await request(app)
        .get('/api/v1/organizations/current/advisor/conversations/conv-rival-owner/messages')
        .set('Authorization', 'Bearer token-owner');

      expect(res.status).toBe(404); // Fails closed, conversation does not exist in owner's org scope
    });

    it('prevents cross-user conversation deletion', async () => {
      // Rival owner attempts to delete Titan gym owner's conversation
      const res = await request(app)
        .delete('/api/v1/organizations/current/advisor/conversations/conv-owner-titan')
        .set('Authorization', 'Bearer token-rival-owner');

      // The deletion is scoped to authenticated user and organization, so conv-owner-titan is not deleted
      const { supabase } = await import('../../src/database/supabase');
      const store = (supabase as any)._getStore();
      const stillExists = store.ai_conversations.some((c: any) => c.id === 'conv-owner-titan');
      expect(stillExists).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. TOOL REGISTRY & READ-ONLY ENFORCEMENT
  // ─────────────────────────────────────────────────────────────
  describe('3. Initial Business Tool Registry & Security Matrix', () => {
    it('verifies all 7 canonical Phase 8J B2B tools are registered', () => {
      expect(b2bToolRegistry.hasTool('get_organization_overview')).toBe(true);
      expect(b2bToolRegistry.hasTool('get_member_summary')).toBe(true);
      expect(b2bToolRegistry.hasTool('get_attendance_summary')).toBe(true);
      expect(b2bToolRegistry.hasTool('get_trainer_assignments')).toBe(true);
      expect(b2bToolRegistry.hasTool('get_retention_summary')).toBe(true);
      expect(b2bToolRegistry.hasTool('get_attention_items')).toBe(true);
      expect(b2bToolRegistry.hasTool('get_organization_billing_status')).toBe(true);
      expect(b2bToolRegistry.listTools().length).toBe(7);
    });

    it('verifies consumer workout/meal mutation tools are NOT registered in B2B registry', () => {
      expect(b2bToolRegistry.hasTool('create_workout_plan')).toBe(false);
      expect(b2bToolRegistry.hasTool('log_workout_session')).toBe(false);
      expect(b2bToolRegistry.hasTool('log_meal')).toBe(false);
    });

    it('enforces that Gym Manager cannot execute get_organization_billing_status tool', async () => {
      const tool = b2bToolRegistry.getTool('get_organization_billing_status');
      expect(tool).toBeDefined();

      const permissionEngine = new ToolPermissionEngine();
      const permRes = permissionEngine.validateToolExecution(
        tool!,
        { userId: 'usr-mgr-1', organizationId: 'org-titan-1', userRole: 'Gym Manager' },
        {}
      );

      // ToolPermissionEngine denies Gym Manager for billing tool
      expect(permRes.isFailure()).toBe(true);
      expect(permRes.error.statusCode).toBe(403);
    });

    it('allows Organization Owner and Platform Super Admin to execute billing tool', () => {
      const tool = b2bToolRegistry.getTool('get_organization_billing_status');
      const permissionEngine = new ToolPermissionEngine();

      const ownerPerm = permissionEngine.validateToolExecution(
        tool!,
        { userId: 'usr-owner-1', organizationId: 'org-titan-1', userRole: 'Organization Owner' },
        {}
      );
      expect(ownerPerm.isSuccess()).toBe(true);

      const adminPerm = permissionEngine.validateToolExecution(
        tool!,
        { userId: 'usr-super-1', organizationId: 'org-titan-1', userRole: 'Platform Super Admin' },
        {}
      );
      expect(adminPerm.isSuccess()).toBe(true);
    });

    it('blocks model-generated argument spoofing of organization_id or user_id in tool calls', () => {
      const tool = b2bToolRegistry.getTool('get_member_summary');
      const permissionEngine = new ToolPermissionEngine();

      const spoofRes = permissionEngine.validateToolExecution(
        tool!,
        { userId: 'usr-owner-1', organizationId: 'org-titan-1', userRole: 'Organization Owner' },
        { organization_id: 'org-rival-2' } // Model hallucinated or injected a different tenant ID
      );

      expect(spoofRes.isFailure()).toBe(true);
      expect(spoofRes.error.message).toContain('Cross-tenant access denied');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. BUSINESS DATA INTEGRITY & BOUNDED EXECUTION
  // ─────────────────────────────────────────────────────────────
  describe('4. Business Data Integrity & Bounded Queries', () => {
    it('executes get_organization_overview and returns structured read-only metrics', async () => {
      const tool = b2bToolRegistry.getTool('get_organization_overview');
      const result = await tool!.execute({}, {
        userId: 'usr-owner-1',
        organizationId: 'org-titan-1',
        userRole: 'Organization Owner',
      });

      expect(result.isSuccess()).toBe(true);
      expect(result.value.success).toBe(true);
      expect(result.value.data.organizationName).toBe('Titan Gym Central');
      expect(result.value.data.metrics.totalMembers).toBe(2);
      expect(result.value.data.locations.length).toBe(1);
    });

    it('bounds query windows for member and attendance summary to 7d, 30d, 90d', async () => {
      const tool = b2bToolRegistry.getTool('get_member_summary');
      const result = await tool!.execute({ window: '30d' }, {
        userId: 'usr-owner-1',
        organizationId: 'org-titan-1',
        userRole: 'Organization Owner',
      });

      expect(result.isSuccess()).toBe(true);
      expect(result.value.data.timeWindow).toBe('30d');
      expect(typeof result.value.data.totalMembers).toBe('number');
    });

    it('returns honest insufficient_history status when historical retention data is absent', async () => {
      const tool = b2bToolRegistry.getTool('get_retention_summary');
      const result = await tool!.execute({ window: '30d' }, {
        userId: 'usr-owner-1',
        organizationId: 'org-titan-1',
        userRole: 'Organization Owner',
      });

      expect(result.isSuccess()).toBe(true);
      // Since prior period logs are 0 in mock store, retention returns insufficient_history
      expect(result.value.data.status).toBe('insufficient_history');
      expect(result.value.data.retentionRatePct).toBeNull();
    });

    it('returns structured B2B organization billing metrics with GAAP cash accounting notice', async () => {
      const tool = b2bToolRegistry.getTool('get_organization_billing_status');
      const result = await tool!.execute({}, {
        userId: 'usr-owner-1',
        organizationId: 'org-titan-1',
        userRole: 'Organization Owner',
      });

      expect(result.isSuccess()).toBe(true);
      expect(result.value.data.subscriptionStatus).toBe('active');
      expect(result.value.data.activePlanCode).toBe('gym_growth');
      expect(result.value.data.accountingNote).toContain('STRIVA B2C membership subscriptions are strictly isolated');
    });

    it('fails closed when tenant organizationId is missing in execution context', async () => {
      const tool = b2bToolRegistry.getTool('get_organization_overview');
      const result = await tool!.execute({}, {
        userId: 'usr-owner-1',
        userRole: 'Organization Owner',
      });

      expect(result.isFailure()).toBe(true);
      expect(result.error.statusCode).toBe(400);
    });
  });
});
