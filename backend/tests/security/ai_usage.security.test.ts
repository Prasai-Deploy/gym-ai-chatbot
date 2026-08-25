import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRunner } from '../../src/modules/ai/agents/AgentRunner';
import { AIUsageRepository } from '../../src/modules/ai/repositories/AIUsageRepository';
import { MemoryEngine } from '../../src/modules/ai/agents/MemoryEngine';
import { IAIProvider, ChatResponse } from '../../src/modules/ai/providers/IAIProvider';
import { AIProviderRateLimitError } from '../../src/modules/ai/providers/AIProviderError';

describe('Persistent AI Usage Analytics & Token Accounting Suite', () => {
  let usageDbRows: any[] = [];
  let memoryDbRows: any[] = [];

  const createMockSupabase = () => {
    return {
      from: (table: string) => {
        if (table === 'ai_usage_analytics') {
          return {
            insert: (payload: any) => ({
              select: () => ({
                single: async () => {
                  const row = {
                    id: `usage-${Date.now()}-${Math.random()}`,
                    ...payload,
                    created_at: new Date().toISOString(),
                  };
                  usageDbRows.push(row);
                  return { data: row, error: null };
                },
              }),
            }),
            select: () => {
              const filters: ((r: any) => boolean)[] = [];
              const chain: any = {
                eq: (col: string, val: any) => {
                  filters.push((r: any) => r[col] === val);
                  return chain;
                },
                order: () => chain,
                limit: (lim: number) => {
                  return {
                    then: (resolve: any) => {
                      const filtered = usageDbRows.filter((r) => filters.every((f) => f(r)));
                      return resolve({ data: filtered.slice(0, lim), error: null });
                    },
                  };
                },
                then: (resolve: any) => {
                  const filtered = usageDbRows.filter((r) => filters.every((f) => f(r)));
                  return resolve({ data: filtered, error: null });
                },
              };
              return chain;
            },
          };
        }

        if (table === 'ai_agent_memories') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => Promise.resolve({ data: memoryDbRows, error: null }),
                  then: (resolve: any) => resolve({ data: memoryDbRows, error: null }),
                }),
                then: (resolve: any) => resolve({ data: memoryDbRows, error: null }),
              }),
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    } as any;
  };

  beforeEach(() => {
    usageDbRows = [];
    memoryDbRows = [];
  });

  it('10. actual provider token usage is persisted to the database', async () => {
    const mockSupabase = createMockSupabase();
    const usageRepo = new AIUsageRepository(mockSupabase);
    const memoryEngine = new MemoryEngine(mockSupabase);

    const mockProvider: IAIProvider = {
      generateCompletion: async (): Promise<ChatResponse> => ({
        message: { role: 'assistant', content: 'Here is your workout advice' },
        finish_reason: 'stop',
        usage: { prompt_tokens: 142, completion_tokens: 68, total_tokens: 210 },
        model: 'compound-beta',
        provider: 'groq',
      }),
    };

    const runner = new AgentRunner(mockProvider, memoryEngine, usageRepo);
    const response = await runner.run(
      'Give me a leg workout routine',
      { userId: 'usr-1', organizationId: 'org-1', conversationId: 'conv-100', userRole: 'Member' }
    );

    expect(response.promptTokens).toBe(142);
    expect(response.completionTokens).toBe(68);
    expect(response.totalTokens).toBe(210);

    expect(usageDbRows.length).toBe(1);
    expect(usageDbRows[0].prompt_tokens).toBe(142);
    expect(usageDbRows[0].completion_tokens).toBe(68);
    expect(usageDbRows[0].total_tokens).toBe(210);
    expect(usageDbRows[0].success).toBe(true);
  });

  it('11. prompt/completion/total token fields are correct with null handling when unavailable', async () => {
    const mockSupabase = createMockSupabase();
    const usageRepo = new AIUsageRepository(mockSupabase);
    const memoryEngine = new MemoryEngine(mockSupabase);

    // Provider returns no usage metrics
    const mockProvider: IAIProvider = {
      generateCompletion: async (): Promise<ChatResponse> => ({
        message: { role: 'assistant', content: 'Response without tokens' },
        finish_reason: 'stop',
        usage: null,
        model: 'test-model',
        provider: 'custom-ai',
      }),
    };

    const runner = new AgentRunner(mockProvider, memoryEngine, usageRepo);
    const response = await runner.run(
      'Hello',
      { userId: 'usr-1', organizationId: 'org-1', conversationId: 'conv-101', userRole: 'Member' }
    );

    // Should NOT invent fake 0 tokens
    expect(response.promptTokens).toBeNull();
    expect(response.completionTokens).toBeNull();
    expect(response.totalTokens).toBeNull();

    expect(usageDbRows.length).toBe(1);
    expect(usageDbRows[0].prompt_tokens).toBeNull();
    expect(usageDbRows[0].completion_tokens).toBeNull();
    expect(usageDbRows[0].total_tokens).toBeNull();
  });

  it('12. tool calls and tool execution counts are recorded accurately', async () => {
    const mockSupabase = createMockSupabase();
    const usageRepo = new AIUsageRepository(mockSupabase);
    const memoryEngine = new MemoryEngine(mockSupabase);

    let callCount = 0;
    const mockProvider: IAIProvider = {
      generateCompletion: async (_messages, tools): Promise<ChatResponse> => {
        callCount++;
        if (callCount === 1) {
          return {
            message: {
              role: 'assistant',
              content: '',
              tool_calls: [
                {
                  id: 'call_1',
                  function: {
                    name: 'get_recovery_score',
                    arguments: '{}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
            usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
            model: 'compound-beta',
            provider: 'groq',
          };
        }

        return {
          message: { role: 'assistant', content: 'Your recovery score is 84, go lift heavy!' },
          finish_reason: 'stop',
          usage: { prompt_tokens: 120, completion_tokens: 35, total_tokens: 155 },
          model: 'compound-beta',
          provider: 'groq',
        };
      },
    };

    const runner = new AgentRunner(mockProvider, memoryEngine, usageRepo);
    // 'recovery' trigger keyword routes to recovery agent
    const response = await runner.run(
      'Check my recovery score and sleep fatigue',
      { userId: 'usr-1', organizationId: 'org-1', conversationId: 'conv-102', userRole: 'Member' }
    );

    expect(response.toolsCalled).toContain('get_recovery_score');
    expect(response.promptTokens).toBe(170); // 50 + 120
    expect(response.completionTokens).toBe(55); // 20 + 35
    expect(response.totalTokens).toBe(225); // 70 + 155

    expect(usageDbRows.length).toBe(1);
    expect(usageDbRows[0].tool_calls_count).toBe(1);
    expect(usageDbRows[0].tools_called).toContain('get_recovery_score');
  });

  it('13. provider, model, and session are persisted accurately', async () => {
    const mockSupabase = createMockSupabase();
    const usageRepo = new AIUsageRepository(mockSupabase);
    const memoryEngine = new MemoryEngine(mockSupabase);

    const mockProvider: IAIProvider = {
      generateCompletion: async (): Promise<ChatResponse> => ({
        message: { role: 'assistant', content: 'Nutrition guidance' },
        finish_reason: 'stop',
        usage: { prompt_tokens: 30, completion_tokens: 40, total_tokens: 70 },
        model: 'groq/llama-3.3-70b-versatile',
        provider: 'groq',
      }),
    };

    const runner = new AgentRunner(mockProvider, memoryEngine, usageRepo);
    await runner.run(
      'What are my daily calories and protein macros',
      { userId: 'usr-42', organizationId: 'org-99', conversationId: 'session-xyz', userRole: 'Member' }
    );

    expect(usageDbRows.length).toBe(1);
    const record = usageDbRows[0];
    expect(record.user_id).toBe('usr-42');
    expect(record.organization_id).toBe('org-99');
    expect(record.session_id).toBe('session-xyz');
    expect(record.provider).toBe('groq');
    expect(record.model).toBe('groq/llama-3.3-70b-versatile');
    expect(record.agent_id).toBe('nutrition');
  });

  it('14. failed AI invocation is recorded appropriately with failure status and error category', async () => {
    const mockSupabase = createMockSupabase();
    const usageRepo = new AIUsageRepository(mockSupabase);
    const memoryEngine = new MemoryEngine(mockSupabase);

    const mockFailingProvider: IAIProvider = {
      generateCompletion: async (): Promise<ChatResponse> => {
        throw new AIProviderRateLimitError('Too many requests to Groq API', 'groq');
      },
    };

    const runner = new AgentRunner(mockFailingProvider, memoryEngine, usageRepo);

    await expect(
      runner.run(
        'Workout plan',
        { userId: 'usr-1', organizationId: 'org-1', conversationId: 'conv-fail', userRole: 'Member' }
      )
    ).rejects.toThrow('Too many requests to Groq API');

    // Failed invocation must be logged to database with success: false
    expect(usageDbRows.length).toBe(1);
    expect(usageDbRows[0].success).toBe(false);
    expect(usageDbRows[0].error_category).toBe('RATE_LIMIT_ERROR');
    expect(usageDbRows[0].user_id).toBe('usr-1');
  });

  it('15. AgentRunner no longer relies on in-memory analyticsLog array (reads from DB)', async () => {
    const mockSupabase = createMockSupabase();
    const usageRepo = new AIUsageRepository(mockSupabase);
    const memoryEngine = new MemoryEngine(mockSupabase);

    const mockProvider: IAIProvider = {
      generateCompletion: async (): Promise<ChatResponse> => ({
        message: { role: 'assistant', content: 'Persisted usage' },
        finish_reason: 'stop',
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        model: 'compound-beta',
        provider: 'groq',
      }),
    };

    const runner1 = new AgentRunner(mockProvider, memoryEngine, usageRepo);
    await runner1.run('Hello', { userId: 'usr-1', organizationId: 'org-1', conversationId: 'c1', userRole: 'Member' });

    // Create fresh instance (simulating restart)
    const runner2 = new AgentRunner(mockProvider, memoryEngine, usageRepo);
    const analytics = await runner2.getAnalytics('org-1');

    expect(analytics.length).toBe(1);
    expect(analytics[0].organizationId).toBe('org-1');
    expect(analytics[0].totalTokens).toBe(20);
  });
});
