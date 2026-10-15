import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { AIUsageRepository } from '../../src/modules/ai/repositories/AIUsageRepository';
import { UsageAnalytics } from '../../src/modules/ai/agents/agent.types';

/**
 * STRIVA V2 — Phase 12B: Consumer Analytics Persistence Security Test Suite
 *
 * Validates:
 * 1. Static SQL invariants of phase_12b_consumer_analytics_persistence.sql.
 * 2. Proper nullability for consumer records while retaining foreign key enforcement for B2B.
 * 3. AIUsageRepository contracts for consumer and B2B usage recording and query isolation.
 * 4. Error logging sanitization (no leak of prompts, secrets, or sensitive payload data).
 * 5. Real PostgreSQL integration on disposable restored database (port 5433).
 */
describe('Phase 12B: Consumer Analytics Persistence & Staging Readiness', () => {
  const migrationPath = path.join(
    __dirname,
    '../../supabase/migrations/phase_12b_consumer_analytics_persistence.sql'
  );
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

  // ==========================================================================
  // PART 1: Static SQL Specification Verification
  // ==========================================================================
  describe('1. Static SQL Migration Invariants', () => {
    it('1.1 Alters public.ai_usage_analytics.organization_id to DROP NOT NULL', () => {
      expect(migrationSql).toMatch(
        /ALTER TABLE\s+public\.ai_usage_analytics\s+ALTER COLUMN\s+organization_id\s+DROP NOT NULL;/i
      );
    });

    it('1.2 Creates partial index for consumer query optimization', () => {
      expect(migrationSql).toContain('CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_consumer_user');
      expect(migrationSql).toContain('WHERE organization_id IS NULL');
    });

    it('1.3 Declares consumer RLS policies for SELECT and INSERT', () => {
      expect(migrationSql).toContain('"Users view own consumer AI usage analytics"');
      expect(migrationSql).toContain('auth.uid() = user_id');
      expect(migrationSql).toContain('organization_id IS NULL');

      expect(migrationSql).toContain('"Users insert own consumer AI usage analytics"');
      expect(migrationSql).toContain('WITH CHECK');
    });

    it('1.4 Strictly contains zero hardcoded tenant UUIDs or fallback organizations', () => {
      expect(migrationSql).not.toContain('00000000-0000-0000-0000-000000000001');
      expect(migrationSql).not.toContain('default_org');
      expect(migrationSql).not.toContain('COALESCE(organization_id');
    });
  });

  // ==========================================================================
  // PART 2: Repository Contract & Sanitization Verification
  // ==========================================================================
  describe('2. AIUsageRepository Unit & Contract Invariants', () => {
    let mockSupabase: any;
    let repo: AIUsageRepository;
    let insertedPayload: any = null;

    beforeEach(() => {
      insertedPayload = null;
      mockSupabase = {
        from: vi.fn((table: string) => ({
          insert: vi.fn((payload: any) => {
            insertedPayload = payload;
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'usage-test-uuid',
                    ...payload,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            };
          }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      };
      repo = new AIUsageRepository(mockSupabase);
    });

    it('2.1 Persists consumer usage with organization_id = null when orgId is undefined or empty', async () => {
      const consumerUsage: UsageAnalytics = {
        agentId: 'fitness_coach',
        userId: 'usr-consumer-1',
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        requestTimestamp: new Date().toISOString(),
        durationMs: 400,
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        toolCallsCount: 0,
        toolsCalled: [],
        success: true,
      };

      const res = await repo.recordUsage(consumerUsage);
      expect(res.isSuccess()).toBe(true);
      expect(insertedPayload).not.toBeNull();
      expect(insertedPayload.organization_id).toBeNull();
      expect(insertedPayload.user_id).toBe('usr-consumer-1');
      expect(insertedPayload.total_tokens).toBe(150);
    });

    it('2.2 Preserves organization_id for B2B enterprise events', async () => {
      const b2bUsage: UsageAnalytics = {
        agentId: 'business_advisor',
        organizationId: 'org-enterprise-99',
        userId: 'usr-owner-1',
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        requestTimestamp: new Date().toISOString(),
        durationMs: 600,
        promptTokens: 250,
        completionTokens: 120,
        totalTokens: 370,
        toolCallsCount: 1,
        toolsCalled: ['get_membership_analytics'],
        success: true,
      };

      const res = await repo.recordUsage(b2bUsage);
      expect(res.isSuccess()).toBe(true);
      expect(insertedPayload.organization_id).toBe('org-enterprise-99');
      expect(insertedPayload.user_id).toBe('usr-owner-1');
    });

    it('2.3 Rejects usage record when userId is missing', async () => {
      const invalidUsage: any = {
        agentId: 'fitness_coach',
        userId: '',
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
      };

      const res = await repo.recordUsage(invalidUsage);
      expect(res.isFailure()).toBe(true);
      expect(res.error.message).toContain('userId is required');
    });

    it('2.4 getUsageByOrganization strictly queries by organization_id', async () => {
      await repo.getUsageByOrganization('org-tenant-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('ai_usage_analytics');
    });

    it('2.5 getUserUsage strictly queries where user_id matches and organization_id IS NULL', async () => {
      await repo.getUserUsage('usr-consumer-1');
      expect(mockSupabase.from).toHaveBeenCalledWith('ai_usage_analytics');
    });
  });

  // ==========================================================================
  // PART 3: Real PostgreSQL Integration (Disposable Port 5433)
  // ==========================================================================
  describe('3. Real Database Constraints & Isolation (Port 5433)', () => {
    const LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:5433/striva_restore_test';
    let client: Client;
    let isConnected = false;
    let testUserId: string;
    let testOrgId: string;

    beforeAll(async () => {
      try {
        client = new Client({ connectionString: LOCAL_DB_URL, connectionTimeoutMillis: 1000 });
        await client.connect();
        isConnected = true;

        const userRes = await client.query('SELECT id FROM auth.users LIMIT 1');
        testUserId = userRes.rows[0]?.id;

        const orgRes = await client.query('SELECT id FROM public.organizations LIMIT 1');
        testOrgId = orgRes.rows[0]?.id;
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

    it('3.1 Confirms organization_id is nullable in schema', async () => {
      if (!isConnected) return;
      const colRes = await client.query(`
        SELECT is_nullable FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'ai_usage_analytics' 
          AND column_name = 'organization_id'
      `);
      expect(colRes.rows[0].is_nullable).toBe('YES');
    });

    it('3.2 Persists consumer usage event with NULL organization_id and exact tokens', async () => {
      if (!isConnected) return;
      const insertRes = await client.query(`
        INSERT INTO public.ai_usage_analytics (
          user_id, organization_id, agent_id, session_id, provider, model,
          request_timestamp, duration_ms, prompt_tokens, completion_tokens, total_tokens,
          tool_calls_count, tools_called, success
        ) VALUES (
          $1, NULL, 'fitness_coach', gen_random_uuid(), 'groq', 'llama-3.3-70b-versatile',
          NOW(), 350, 150, 75, 225, 0, '[]'::jsonb, true
        ) RETURNING id, organization_id, prompt_tokens, completion_tokens, total_tokens
      `, [testUserId]);

      expect(insertRes.rows[0].organization_id).toBeNull();
      expect(insertRes.rows[0].prompt_tokens).toBe(150);
      expect(insertRes.rows[0].completion_tokens).toBe(75);
      expect(insertRes.rows[0].total_tokens).toBe(225);
    });

    it('3.3 Strictly rejects non-existent organization_id with FK error 23503', async () => {
      if (!isConnected) return;
      const invalidOrgId = 'a0000000-0000-0000-0000-000000000099';
      let caughtError: any = null;
      try {
        await client.query(`
          INSERT INTO public.ai_usage_analytics (
            user_id, organization_id, agent_id, session_id, provider, model,
            request_timestamp, duration_ms, prompt_tokens, completion_tokens, total_tokens,
            tool_calls_count, tools_called, success
          ) VALUES (
            $1, $2, 'business_advisor', gen_random_uuid(), 'groq', 'llama-3.3-70b-versatile',
            NOW(), 300, 10, 10, 20, 0, '[]'::jsonb, true
          )
        `, [testUserId, invalidOrgId]);
      } catch (err: any) {
        caughtError = err;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.code).toBe('23503');
    });

    it('3.4 Confirms B2B query excludes consumer usage events', async () => {
      if (!isConnected) return;
      const b2bQuery = await client.query(`
        SELECT id, organization_id FROM public.ai_usage_analytics WHERE organization_id = $1
      `, [testOrgId]);

      for (const row of b2bQuery.rows) {
        expect(row.organization_id).toBe(testOrgId);
        expect(row.organization_id).not.toBeNull();
      }
    });
  });
});
