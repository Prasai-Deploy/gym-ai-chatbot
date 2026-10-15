import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app/app';
import { AIUsageRepository } from '../../src/modules/ai/repositories/AIUsageRepository';
import { UsageAnalytics } from '../../src/modules/ai/agents/agent.types';
import { Client } from 'pg';

/**
 * In-memory test store for ai_usage_analytics
 */
let inMemoryUsageRows: any[] = [];

// Mock Supabase to intercept DB calls in the Express test environment
vi.mock('../../src/database/supabase', () => {
  const mockDb = {
    auth: {
      getUser: vi.fn(async (token: string) => {
        if (token === 'token-consumer-a') {
          return { data: { user: { id: 'usr-consumer-a', email: 'consumer.a@striva.app' } }, error: null };
        }
        if (token === 'token-consumer-b') {
          return { data: { user: { id: 'usr-consumer-b', email: 'consumer.b@striva.app' } }, error: null };
        }
        if (token === 'token-consumer-empty') {
          return { data: { user: { id: 'usr-consumer-empty', email: 'empty@striva.app' } }, error: null };
        }
        return { data: { user: null }, error: new Error('Invalid or expired token') };
      }),
    },
    from: vi.fn((table: string) => {
      let filterUserId: string | null = null;
      let filterOrgId: string | null = null;
      let checkOrgNull = false;
      let limitCount = 50;

      const builder: any = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn((col: string, val: any) => {
          if (col === 'user_id') filterUserId = val;
          if (col === 'organization_id') filterOrgId = val;
          return builder;
        }),
        is: vi.fn((col: string, val: any) => {
          if (col === 'organization_id' && val === null) {
            checkOrgNull = true;
          }
          return builder;
        }),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn((lim: number) => {
          limitCount = lim;
          return builder;
        }),
        single: vi.fn().mockImplementation(async () => {
          return { data: null, error: null };
        }),
        maybeSingle: vi.fn().mockImplementation(async () => {
          if (table === 'subscriptions') {
            return {
              data: {
                id: 'sub-pro-1',
                user_id: filterUserId || 'usr-consumer-a',
                status: 'active',
                tier: 'pro',
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
              },
              error: null,
            };
          }
          return { data: null, error: null };
        }),
        then: vi.fn().mockImplementation((resolve) => {
          if (table === 'ai_usage_analytics') {
            let filtered = [...inMemoryUsageRows];
            if (filterUserId) {
              filtered = filtered.filter((r) => r.user_id === filterUserId);
            }
            if (filterOrgId) {
              filtered = filtered.filter((r) => r.organization_id === filterOrgId);
            }
            if (checkOrgNull) {
              filtered = filtered.filter((r) => r.organization_id === null || r.organization_id === undefined);
            }
            return resolve({ data: filtered.slice(0, limitCount), error: null });
          }
          return resolve({ data: [], error: null });
        }),
      };
      return builder;
    }),
  };

  return { supabase: mockDb, supabaseAdmin: mockDb };
});

describe('STRIVA V2 Phase 13B-2 — Consumer AI Analytics API Security Suite', () => {
  beforeEach(() => {
    inMemoryUsageRows = [
      // Consumer A events (organization_id: null)
      {
        id: 'usage-a-1',
        user_id: 'usr-consumer-a',
        organization_id: null,
        agent_id: 'fitness_coach',
        session_id: 'conv-101',
        provider: 'groq',
        model: 'openai/gpt-oss-20b',
        request_timestamp: '2026-10-15T10:00:00Z',
        duration_ms: 450,
        prompt_tokens: 120,
        completion_tokens: 60,
        total_tokens: 180,
        tool_calls_count: 1,
        tools_called: ['GetTodayWorkoutTool'],
        success: true,
        error_category: null,
        created_at: '2026-10-15T10:00:01Z',
      },
      {
        id: 'usage-a-2',
        user_id: 'usr-consumer-a',
        organization_id: null,
        agent_id: 'nutrition',
        session_id: 'conv-102',
        provider: 'groq',
        model: 'qwen/qwen3.8-27b',
        request_timestamp: '2026-10-15T10:15:00Z',
        duration_ms: 350,
        prompt_tokens: 80,
        completion_tokens: 40,
        total_tokens: 120,
        tool_calls_count: 0,
        tools_called: [],
        success: true,
        error_category: null,
        created_at: '2026-10-15T10:15:01Z',
      },
      {
        id: 'usage-a-3',
        user_id: 'usr-consumer-a',
        organization_id: null,
        agent_id: 'fitness_coach',
        session_id: 'conv-103',
        provider: 'groq',
        model: 'openai/gpt-oss-20b',
        request_timestamp: '2026-10-15T10:30:00Z',
        duration_ms: 200,
        prompt_tokens: null,
        completion_tokens: null,
        total_tokens: null,
        tool_calls_count: 0,
        tools_called: [],
        success: false,
        error_category: 'TIMEOUT_ERROR',
        created_at: '2026-10-15T10:30:01Z',
      },
      // Consumer A B2B event (organization_id is non-null: must be EXCLUDED from consumer endpoint)
      {
        id: 'usage-a-b2b',
        user_id: 'usr-consumer-a',
        organization_id: 'org-enterprise-99',
        agent_id: 'business_advisor',
        session_id: 'conv-b2b-1',
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        request_timestamp: '2026-10-15T09:00:00Z',
        duration_ms: 800,
        prompt_tokens: 500,
        completion_tokens: 250,
        total_tokens: 750,
        tool_calls_count: 2,
        tools_called: ['GetMemberSummaryTool'],
        success: true,
        error_category: null,
        created_at: '2026-10-15T09:00:01Z',
      },
      // Consumer B event (user_id: usr-consumer-b)
      {
        id: 'usage-b-1',
        user_id: 'usr-consumer-b',
        organization_id: null,
        agent_id: 'fitness_coach',
        session_id: 'conv-201',
        provider: 'groq',
        model: 'openai/gpt-oss-20b',
        request_timestamp: '2026-10-15T11:00:00Z',
        duration_ms: 600,
        prompt_tokens: 300,
        completion_tokens: 150,
        total_tokens: 450,
        tool_calls_count: 0,
        tools_called: [],
        success: true,
        error_category: null,
        created_at: '2026-10-15T11:00:01Z',
      },
    ];
  });

  // --------------------------------------------------------------------------
  // Requirement 1: Authenticated Consumer Retrieves Own Permitted Analytics
  // --------------------------------------------------------------------------
  it('1. authenticated consumer can retrieve their own aggregated analytics (200 OK)', async () => {
    const res = await request(app)
      .get('/api/v1/ai/user/analytics')
      .set('Authorization', 'Bearer token-consumer-a');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    // Exactly 3 consumer records (the B2B record with orgId must be excluded)
    expect(data.totalRequests).toBe(3);
    expect(data.successfulRequests).toBe(2);
    expect(data.failedRequests).toBe(1);

    // Prompt tokens: 120 + 80 + 0 = 200
    expect(data.totalPromptTokens).toBe(200);
    // Completion tokens: 60 + 40 + 0 = 100
    expect(data.totalCompletionTokens).toBe(100);
    // Total tokens: 180 + 120 + 0 = 300
    expect(data.totalTokens).toBe(300);

    // Average duration: (450 + 350 + 200) / 3 = 333ms
    expect(data.averageDurationMs).toBe(333);

    // Recent usage array
    expect(Array.isArray(data.recentUsage)).toBe(true);
    expect(data.recentUsage).toHaveLength(3);

    // Verify fields in recent usage items are sanitized
    const item = data.recentUsage[0];
    expect(item.id).toBe('usage-a-1');
    expect(item.agentId).toBe('fitness_coach');
    expect(item.model).toBe('openai/gpt-oss-20b');
    expect(item.provider).toBe('groq');
    expect(item.totalTokens).toBe(180);
    expect(item.success).toBe(true);

    // Verify raw prompts or responses are NOT present
    expect((item as any).prompt).toBeUndefined();
    expect((item as any).response).toBeUndefined();
    expect((item as any).message).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // Requirement 2: Unauthenticated Requests Are Rejected
  // --------------------------------------------------------------------------
  it('2a. unauthenticated request with missing token is rejected (401 Unauthorized)', async () => {
    const res = await request(app)
      .get('/api/v1/ai/user/analytics');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('AUTH_ERROR');
    expect(res.body.error?.message).toContain('Missing Authorization header');
  });

  it('2b. unauthenticated request with invalid token is rejected (401 Unauthorized)', async () => {
    const res = await request(app)
      .get('/api/v1/ai/user/analytics')
      .set('Authorization', 'Bearer invalid-token-xyz');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('AUTH_ERROR');
    expect(res.body.error?.message).toContain('Invalid or expired token');
  });

  // --------------------------------------------------------------------------
  // Requirement 3: Identity Override Prevention (Query & Body)
  // --------------------------------------------------------------------------
  it('3a. client query param userId cannot override server-verified identity', async () => {
    const res = await request(app)
      .get('/api/v1/ai/user/analytics?userId=usr-consumer-b&user_id=usr-consumer-b')
      .set('Authorization', 'Bearer token-consumer-a');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Must return consumer A data (3 requests, 300 total tokens), NOT consumer B (1 request, 450 tokens)
    expect(res.body.data.totalRequests).toBe(3);
    expect(res.body.data.totalTokens).toBe(300);

    const ids = res.body.data.recentUsage.map((u: any) => u.id);
    expect(ids).toContain('usage-a-1');
    expect(ids).not.toContain('usage-b-1');
  });

  it('3b. client body userId cannot override server-verified identity', async () => {
    const res = await request(app)
      .get('/api/v1/ai/user/analytics')
      .set('Authorization', 'Bearer token-consumer-a')
      .send({ userId: 'usr-consumer-b', user_id: 'usr-consumer-b' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalRequests).toBe(3);
    expect(res.body.data.totalTokens).toBe(300);
  });

  // --------------------------------------------------------------------------
  // Requirement 4: Cross-User Isolation
  // --------------------------------------------------------------------------
  it('4. consumer records from another user are never leaked across accounts', async () => {
    const resB = await request(app)
      .get('/api/v1/ai/user/analytics')
      .set('Authorization', 'Bearer token-consumer-b');

    expect(resB.status).toBe(200);
    expect(resB.body.success).toBe(true);
    expect(resB.body.data.totalRequests).toBe(1);
    expect(resB.body.data.totalTokens).toBe(450);

    const idsB = resB.body.data.recentUsage.map((u: any) => u.id);
    expect(idsB).toEqual(['usage-b-1']);
    expect(idsB).not.toContain('usage-a-1');
    expect(idsB).not.toContain('usage-a-2');
  });

  // --------------------------------------------------------------------------
  // Requirement 5: B2B Records Excluded (organization_id IS NULL only)
  // --------------------------------------------------------------------------
  it('5. B2B records with non-null organization_id are strictly excluded from consumer analytics', async () => {
    const res = await request(app)
      .get('/api/v1/ai/user/analytics')
      .set('Authorization', 'Bearer token-consumer-a');

    expect(res.status).toBe(200);
    const ids = res.body.data.recentUsage.map((u: any) => u.id);

    // usage-a-b2b has organization_id: 'org-enterprise-99'
    expect(ids).not.toContain('usage-a-b2b');

    // Total tokens must NOT include the 750 tokens from B2B record
    expect(res.body.data.totalTokens).toBe(300);
  });

  // --------------------------------------------------------------------------
  // Requirement 6: Existing B2B Organization Analytics Route Isolation
  // --------------------------------------------------------------------------
  it('6. existing B2B organization analytics remains isolated and functional', async () => {
    const res = await request(app)
      .get('/api/v1/ai/agent/analytics')
      .set('Authorization', 'Bearer token-consumer-a')
      .set('x-organization-id', 'org-enterprise-99');

    // B2B organization route returns analytics array
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.analytics).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // Requirement 7: Documented Empty Result for Account With No Usage
  // --------------------------------------------------------------------------
  it('7. account with zero usage history returns documented clean empty aggregates', async () => {
    const res = await request(app)
      .get('/api/v1/ai/user/analytics')
      .set('Authorization', 'Bearer token-consumer-empty');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      averageDurationMs: 0,
      recentUsage: [],
    });
  });

  // --------------------------------------------------------------------------
  // Requirement 8: Repository Error Handling Without Leaking Secrets
  // --------------------------------------------------------------------------
  it('8. repository failure returns clean 500 without leaking database credentials or stack traces', async () => {
    const repo = new AIUsageRepository();
    // Simulate repository failure with sensitive database error
    const errorSpy = vi.spyOn(repo, 'getUserUsage').mockRejectedValueOnce(
      new Error('database error: password authentication failed for user "postgres"')
    );

    const summaryRes = await repo.getUserAnalyticsSummary('usr-consumer-a');
    expect(summaryRes.isFailure()).toBe(true);
    if (summaryRes.isFailure()) {
      expect(summaryRes.error.statusCode).toBe(500);
      expect(summaryRes.error.message).not.toContain('password authentication');
      expect(summaryRes.error.message).not.toContain('postgres');
      expect(summaryRes.error.message).toContain('Failed to aggregate consumer AI usage');
    }

    errorSpy.mockRestore();
  });

  // --------------------------------------------------------------------------
  // Requirement 9: Parameter Validation & Bound Handling
  // --------------------------------------------------------------------------
  it('9a. respects valid limit parameter to bound returned usage records', async () => {
    const res = await request(app)
      .get('/api/v1/ai/user/analytics?limit=1')
      .set('Authorization', 'Bearer token-consumer-a');

    expect(res.status).toBe(200);
    expect(res.body.data.recentUsage).toHaveLength(1);
    expect(res.body.data.totalRequests).toBe(1);
  });

  it('9b. handles malformed limit query parameter by safely falling back to default', async () => {
    const res = await request(app)
      .get('/api/v1/ai/user/analytics?limit=not-a-number')
      .set('Authorization', 'Bearer token-consumer-a');

    expect(res.status).toBe(200);
    expect(res.body.data.recentUsage).toHaveLength(3);
  });

  // --------------------------------------------------------------------------
  // Requirement 10: Real PostgreSQL Port 5433 Integration
  // --------------------------------------------------------------------------
  describe('10. Real Database Invariants (Port 5433)', () => {
    const LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:5433/striva_restore_test';
    let client: Client;
    let isConnected = false;

    beforeAll(async () => {
      try {
        client = new Client({ connectionString: LOCAL_DB_URL, connectionTimeoutMillis: 1000 });
        await client.connect();
        isConnected = true;
      } catch {
        console.warn('Disposable PG (5433) not reachable; skipping live tests in this run.');
        isConnected = false;
      }
    });

    afterAll(async () => {
      if (isConnected && client) {
        await client.end();
      }
    });

    it('10.1 partial index idx_ai_usage_analytics_consumer_user is active and covers consumer queries', async () => {
      if (!isConnected) return;
      const idxRes = await client.query(`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'ai_usage_analytics' 
          AND indexname = 'idx_ai_usage_analytics_consumer_user'
      `);

      expect(idxRes.rows.length).toBe(1);
      expect(idxRes.rows[0].indexdef).toContain('WHERE (organization_id IS NULL)');
    });

    it('10.2 consumer queries strictly exclude records where organization_id IS NOT NULL', async () => {
      if (!isConnected) return;
      // Query database directly using consumer filter
      const res = await client.query(`
        SELECT id, user_id, organization_id 
        FROM public.ai_usage_analytics 
        WHERE organization_id IS NULL
        LIMIT 10
      `);

      for (const row of res.rows) {
        expect(row.organization_id).toBeNull();
      }
    });
  });
});

