import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app/app';
import { GroqProvider } from '../../src/modules/ai/providers/GroqProvider';
import { AgentRunner } from '../../src/modules/ai/agents/AgentRunner';
import { toolRegistry } from '../../src/modules/ai/tools/ToolRegistry';

// Mock Supabase
vi.mock('../../src/database/supabase', () => {
  const mockDb = {
    auth: {
      getUser: vi.fn(async (token: string) => {
        if (token === 'token-member-a') {
          return { data: { user: { id: 'usr-member-a', email: 'member.a@striva.app' } }, error: null };
        }
        if (token === 'token-member-b') {
          return { data: { user: { id: 'usr-member-b', email: 'member.b@striva.app' } }, error: null };
        }
        if (token === 'token-demo') {
          return { data: { user: { id: 'usr-demo-1', email: 'demo@sweatfix.com' } }, error: null };
        }
        return { data: { user: null }, error: new Error('Invalid token') };
      }),
    },
    from: vi.fn((table: string) => {
      let filterUserId: string | null = null;
      let filterConvId: string | null = null;
      let filterId: string | null = null;

      const builder: any = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn((col: string, val: any) => {
          if (col === 'user_id') filterUserId = val;
          if (col === 'conversation_id') filterConvId = val;
          if (col === 'id') filterId = val;
          return builder;
        }),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(async () => {
          if (table === 'ai_conversations') {
            if (filterId === 'conv-user-a') {
              if (filterUserId && filterUserId !== 'usr-member-a') {
                return { data: null, error: { message: 'Not found or access denied' } };
              }
              return { data: { id: 'conv-user-a', user_id: 'usr-member-a', title: 'User A Secrets' }, error: null };
            }
            return { data: { id: 'conv-new-1', user_id: filterUserId || 'usr-member-a', title: 'New Conv' }, error: null };
          }
          if (table === 'ai_messages') {
            return { data: { id: 'msg-1', conversation_id: filterConvId || 'conv-user-a', role: 'user', content: 'hello' }, error: null };
          }
          return { data: null, error: null };
        }),
        maybeSingle: vi.fn().mockImplementation(async () => {
          if (table === 'subscriptions') {
            return {
              data: {
                id: 'sub-pro-1',
                user_id: filterUserId || 'usr-member-a',
                status: 'active',
                tier: 'pro',
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
              },
              error: null,
            };
          }
          if (table === 'ai_conversations') {
            if (filterId === 'conv-user-a') {
              if (filterUserId && filterUserId !== 'usr-member-a') {
                return { data: null, error: null };
              }
              return { data: { id: 'conv-user-a', user_id: 'usr-member-a', title: 'User A Secrets' }, error: null };
            }
          }
          return { data: null, error: null };
        }),
        then: vi.fn().mockImplementation((resolve) => {
          if (table === 'ai_conversations') {
            return resolve({ data: [{ id: 'conv-user-a', user_id: 'usr-member-a', title: 'User A Secrets' }], error: null });
          }
          if (table === 'ai_messages') {
            return resolve({
              data: [
                { role: 'user', content: 'Secret medical details of user A' },
                { role: 'assistant', content: 'Rest your shoulder' }
              ],
              error: null
            });
          }
          return resolve({ data: [], error: null });
        }),
      };
      return builder;
    }),
  };
  return { supabase: mockDb, supabaseAdmin: mockDb };
});

describe('STRIVA V2 — Chatbot & API Security & Remediation Verification Suite', () => {

  describe('1. Cross-User Conversation Isolation', () => {
    it('blocks Member B from reading Member A conversation history (404/403 scoped)', async () => {
      const res = await request(app)
        .get('/api/v1/ai/conversations/conv-user-a/messages')
        .set('Authorization', 'Bearer token-member-b');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message).toContain('Conversation not found or access denied');
    });

    it('allows Member A to view their own conversation history (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/ai/conversations/conv-user-a/messages')
        .set('Authorization', 'Bearer token-member-a');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('blocks Member B from sending chat message to Member A conversation (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/ai/chat')
        .set('Authorization', 'Bearer token-member-b')
        .send({
          message: 'Malicious injection into User A chat',
          conversationId: 'conv-user-a'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message).toContain('Conversation not found or access denied');
    });
  });

  describe('2. GroqProvider Model Configuration', () => {
    it('defaults to valid free model openai/gpt-oss-20b when no override is provided', () => {
      const originalEnv = process.env.GROQ_PRIMARY_MODEL;
      delete process.env.GROQ_PRIMARY_MODEL;

      const provider = new GroqProvider('mock-key');
      expect((provider as any).model).toBe('openai/gpt-oss-20b');

      if (originalEnv) process.env.GROQ_PRIMARY_MODEL = originalEnv;
    });

    it('respects constructor model override if specified', () => {
      const provider = new GroqProvider('mock-key', 'custom/test-model');
      expect((provider as any).model).toBe('custom/test-model');
    });
  });

  describe('3. AgentRunner Multi-Turn Tool Calling', () => {
    it('accumulates tool outputs and continues until finish_reason stop', async () => {
      const mockProvider: any = {
        generateCompletion: vi.fn()
          // Turn 1: model calls tool 'get_profile'
          .mockResolvedValueOnce({
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'tc-1',
                  type: 'function',
                  function: { name: 'get_profile', arguments: '{}' },
                },
              ],
            },
            finish_reason: 'tool_calls',
            usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
            model: 'openai/gpt-oss-20b',
            provider: 'groq',
          })
          // Turn 2: model synthesizes final output
          .mockResolvedValueOnce({
            message: {
              role: 'assistant',
              content: 'Your weight is 75kg and today is Leg Day.',
            },
            finish_reason: 'stop',
            usage: { prompt_tokens: 80, completion_tokens: 30, total_tokens: 110 },
            model: 'openai/gpt-oss-20b',
            provider: 'groq',
          }),
      };

      const mockMemory: any = {
        persistCandidate: vi.fn(),
        buildContextSummary: vi.fn().mockResolvedValue(''),
      };
      const mockUsage: any = {
        recordUsage: vi.fn().mockResolvedValue({ isSuccess: () => true }),
      };

      const runner = new AgentRunner(mockProvider, mockMemory, mockUsage);
      (runner as any).toolExecutor = {
        executeToolCall: vi.fn().mockResolvedValue({
          isSuccess: () => true,
          value: { weightKg: 75, workout: 'Leg Day' },
        }),
      };

      const res = await runner.run('What is my profile and workout?', {
        userId: 'usr-member-a',
        organizationId: 'org-test',
        conversationId: 'conv-101',
        userRole: 'Member',
      });

      expect(mockProvider.generateCompletion).toHaveBeenCalledTimes(2);
      expect(res.message.content).toBe('Your weight is 75kg and today is Leg Day.');
      expect(res.toolsCalled).toEqual(['get_profile']);
      expect(res.totalTokens).toBe(180);
      expect(res.model).toBe('openai/gpt-oss-20b');
    });
  });
});
