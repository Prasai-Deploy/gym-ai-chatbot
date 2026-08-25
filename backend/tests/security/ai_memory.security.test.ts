import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryEngine } from '../../src/modules/ai/agents/MemoryEngine';
import fs from 'fs';
import path from 'path';

describe('Persistent AI Memory Security & Reliability Suite', () => {
  // In-memory mock database store simulating PostgreSQL table `ai_agent_memories`
  let databaseRows: any[] = [];

  const createMockSupabase = () => {
    return {
      from: (table: string) => {
        if (table !== 'ai_agent_memories') throw new Error(`Unexpected table ${table}`);

        return {
          upsert: (payload: any, options?: { onConflict: string }) => ({
            select: () => ({
              single: async () => {
                // Check if simulated DB is offline
                if ((globalThis as any).__SIMULATE_DB_DOWN) {
                  return { data: null, error: { message: 'Connection to PostgreSQL server lost' } };
                }

                // Check conflict: user_id, organization_id, agent_id, memory_key
                const existingIdx = databaseRows.findIndex(
                  (r) =>
                    r.user_id === payload.user_id &&
                    r.organization_id === payload.organization_id &&
                    r.agent_id === payload.agent_id &&
                    r.memory_key === payload.memory_key
                );

                const row = {
                  id: `mem-${Date.now()}-${Math.random()}`,
                  ...payload,
                  created_at: existingIdx >= 0 ? databaseRows[existingIdx].created_at : new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };

                if (existingIdx >= 0) {
                  databaseRows[existingIdx] = row;
                } else {
                  databaseRows.push(row);
                }

                return { data: row, error: null };
              },
            }),
          }),

          select: (columns: string = '*') => {
            const filters: ((row: any) => boolean)[] = [];

            const chain = {
              eq: (col: string, val: any) => {
                filters.push((row: any) => row[col] === val);
                return chain;
              },
              then: (resolve: any) => {
                if ((globalThis as any).__SIMULATE_DB_DOWN) {
                  return resolve({ data: null, error: { message: 'Connection to PostgreSQL server lost' } });
                }
                const filtered = databaseRows.filter((r) => filters.every((f) => f(r)));
                return resolve({ data: filtered, error: null });
              },
            };

            return chain;
          },

          delete: () => {
            const filters: ((row: any) => boolean)[] = [];
            const chain = {
              eq: (col: string, val: any) => {
                filters.push((row: any) => row[col] === val);
                return chain;
              },
              then: (resolve: any) => {
                if ((globalThis as any).__SIMULATE_DB_DOWN) {
                  return resolve({ data: null, error: { message: 'DB down' } });
                }
                databaseRows = databaseRows.filter((r) => !filters.every((f) => f(r)));
                return resolve({ data: null, error: null });
              },
            };
            return chain;
          },
        };
      },
    } as any;
  };

  beforeEach(() => {
    databaseRows = [];
    (globalThis as any).__SIMULATE_DB_DOWN = false;
  });

  it('1. remember() persists a memory to storage', async () => {
    const mockSupabase = createMockSupabase();
    const engine = new MemoryEngine(mockSupabase);

    const res = await engine.remember(
      'user-1',
      'favorite_exercise',
      'Barbell Deadlift',
      30,
      'org-1',
      'fitness_coach'
    );

    expect(res.isSuccess()).toBe(true);
    if (res.isSuccess()) {
      expect(res.value.key).toBe('favorite_exercise');
      expect(res.value.value).toBe('Barbell Deadlift');
      expect(res.value.organizationId).toBe('org-1');
    }
    expect(databaseRows.length).toBe(1);
    expect(databaseRows[0].memory_value).toBe('Barbell Deadlift');
  });

  it('2. recall() retrieves persisted memory', async () => {
    const mockSupabase = createMockSupabase();
    const engine = new MemoryEngine(mockSupabase);

    await engine.remember('user-1', 'squat_pr', '140kg', 30, 'org-1', 'fitness_coach');

    const recallRes = await engine.recall('user-1', 'squat_pr', 'org-1', 'fitness_coach');
    expect(recallRes.isSuccess()).toBe(true);
    if (recallRes.isSuccess()) {
      expect(recallRes.value).toBe('140kg');
    }
  });

  it('3. memory survives service recreation (new MemoryEngine instance reads persisted DB)', async () => {
    const mockSupabase = createMockSupabase();
    const engine1 = new MemoryEngine(mockSupabase);

    await engine1.remember('user-1', 'bench_pr', '100kg', 30, 'org-1', 'fitness_coach');

    // Simulate backend restart / new instance
    const engine2 = new MemoryEngine(mockSupabase);
    const recallRes = await engine2.recall('user-1', 'bench_pr', 'org-1', 'fitness_coach');

    expect(recallRes.isSuccess()).toBe(true);
    if (recallRes.isSuccess()) {
      expect(recallRes.value).toBe('100kg');
    }
  });

  it('4. expired memory is not returned', async () => {
    const mockSupabase = createMockSupabase();
    const engine = new MemoryEngine(mockSupabase);

    // Manually insert an expired memory in databaseRows
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 1 day ago
    databaseRows.push({
      id: 'mem-expired',
      user_id: 'user-1',
      organization_id: 'org-1',
      agent_id: 'fitness_coach',
      memory_key: 'temp_injury',
      memory_value: 'mild shoulder strain',
      expires_at: pastDate,
      created_at: pastDate,
      updated_at: pastDate,
    });

    const recallRes = await engine.recall('user-1', 'temp_injury', 'org-1', 'fitness_coach');
    expect(recallRes.isSuccess()).toBe(true);
    if (recallRes.isSuccess()) {
      expect(recallRes.value).toBeNull();
    }

    const summary = await engine.buildContextSummary('user-1', 'fitness_coach', 'org-1');
    expect(summary).toBe('');
  });

  it('5. buildContextSummary() uses persisted memory and formats context', async () => {
    const mockSupabase = createMockSupabase();
    const engine = new MemoryEngine(mockSupabase);

    await engine.remember('user-1', 'goal', 'Hypertrophy', 30, 'org-1', 'fitness_coach');
    await engine.remember('user-1', 'diet', 'High Protein', 30, 'org-1', 'fitness_coach');

    const summary = await engine.buildContextSummary('user-1', 'fitness_coach', 'org-1');
    expect(summary).toContain('[Long-term Memory for Agent: fitness_coach]');
    expect(summary).toContain('- goal: Hypertrophy');
    expect(summary).toContain('- diet: High Protein');
  });

  it('6. different users cannot access each others memories', async () => {
    const mockSupabase = createMockSupabase();
    const engine = new MemoryEngine(mockSupabase);

    await engine.remember('user-A', 'secret_goal', 'Lose 10kg', 30, 'org-1', 'fitness_coach');

    const recallUserB = await engine.recall('user-B', 'secret_goal', 'org-1', 'fitness_coach');
    expect(recallUserB.isSuccess()).toBe(true);
    if (recallUserB.isSuccess()) {
      expect(recallUserB.value).toBeNull();
    }

    const summaryUserB = await engine.buildContextSummary('user-B', 'fitness_coach', 'org-1');
    expect(summaryUserB).toBe('');
  });

  it('7. different organizations cannot access each others memories', async () => {
    const mockSupabase = createMockSupabase();
    const engine = new MemoryEngine(mockSupabase);

    await engine.remember('user-1', 'kpi', 'Retention 95%', 30, 'org-A', 'business_advisor');

    const recallOrgB = await engine.recall('user-1', 'kpi', 'org-B', 'business_advisor');
    expect(recallOrgB.isSuccess()).toBe(true);
    if (recallOrgB.isSuccess()) {
      expect(recallOrgB.value).toBeNull();
    }
  });

  it('8. missing tenant context fails securely (fail-closed)', async () => {
    const mockSupabase = createMockSupabase();
    const engine = new MemoryEngine(mockSupabase);

    // Missing organizationId must fail
    const res = await engine.remember('user-1', 'key', 'val', 30, '', 'fitness_coach');
    expect(res.isFailure()).toBe(true);
    if (res.isFailure()) {
      expect(res.error.message).toContain('Organization ID is required');
    }
  });

  it('9. database persistence failure is surfaced explicitly (not silently swallowed)', async () => {
    const mockSupabase = createMockSupabase();
    const engine = new MemoryEngine(mockSupabase);

    // Simulate DB down
    (globalThis as any).__SIMULATE_DB_DOWN = true;

    const res = await engine.remember('user-1', 'key', 'val', 30, 'org-1', 'fitness_coach');
    expect(res.isFailure()).toBe(true);
    if (res.isFailure()) {
      expect(res.error.statusCode).toBe(500);
      expect(res.error.message).toContain('Database persistence failure');
    }
  });

  it('10. Migration 009 SQL inspection: RLS is fail-closed with no static org fallback', () => {
    const migrationFilePath = path.join(
      __dirname,
      '../../supabase/migrations/009_ai_memory_and_usage.sql'
    );
    const migrationSql = fs.readFileSync(migrationFilePath, 'utf-8');

    expect(migrationSql).toContain('ALTER TABLE public.ai_agent_memories ENABLE ROW LEVEL SECURITY;');
    expect(migrationSql).toContain('ALTER TABLE public.ai_usage_analytics ENABLE ROW LEVEL SECURITY;');
    expect(migrationSql).toContain("NULLIF(current_setting('app.current_organization_id', true), '')::UUID");
    expect(migrationSql).not.toContain("'00000000-0000-0000-0000-000000000001'");
  });
});
