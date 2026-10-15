import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app/app';
import { ContextBuilder } from '../../src/modules/ai/core/ContextBuilder';
import { PromptComposer } from '../../src/modules/ai/core/PromptComposer';
import { ToolRegistry } from '../../src/modules/ai/tools/ToolRegistry';
import { ToolPermissionEngine } from '../../src/modules/ai/safety/ToolPermissionEngine';
import { ConversationManager } from '../../src/modules/ai/core/ConversationManager';
import { StreamManager } from '../../src/modules/ai/core/StreamManager';
import {
  AIProviderError,
  AIProviderConfigError,
  AIProviderRateLimitError,
  AIProviderNetworkError,
  AIModelNotFoundError,
  AIContextExceededError,
  AIServiceUnavailableError,
} from '../../src/modules/ai/providers/AIProviderError';
import {
  GetProfileTool,
  GetGoalsTool,
  GetTodayWorkoutTool,
  GetProgressTool,
  GetNutritionTool,
  GetRecoveryTool,
  CreateWorkoutTool,
  ModifyWorkoutTool,
  LogWorkoutToolImpl,
  LogMealTool,
  LogWaterTool,
  UpdateGoalTool,
} from '../../src/modules/ai/tools/impl/TrinetraTools';

// Mock Supabase
vi.mock('../../src/database/supabase', () => {
  const mockDb = {
    auth: {
      getUser: vi.fn(async (token: string) => {
        if (token === 'token-valid-member') {
          return { data: { user: { id: 'usr-trinetra-1', email: 'trinetra.member@striva.app' } }, error: null };
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
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(async () => {
          if (table === 'ai_conversations') {
            return { data: { id: 'conv-101', user_id: 'usr-trinetra-1', title: 'Chest Workout Discussion' }, error: null };
          }
          if (table === 'ai_messages') {
            return { data: { id: 'msg-1', conversation_id: 'conv-101', role: 'user', content: 'Hello' }, error: null };
          }
          return { data: null, error: null };
        }),
        maybeSingle: vi.fn().mockImplementation(async () => {
          if (table === 'subscriptions') {
            return {
              data: {
                id: 'sub-trinetra-1',
                user_id: 'usr-trinetra-1',
                status: 'trialing',
                tier: 'pro',
                trial_started_at: new Date(Date.now() - 2 * 86400000).toISOString(),
                trial_ends_at: new Date(Date.now() + 12 * 86400000).toISOString(),
                current_period_start: new Date(Date.now() - 2 * 86400000).toISOString(),
                current_period_end: new Date(Date.now() + 12 * 86400000).toISOString(),
              },
              error: null,
            };
          }
          return { data: null, error: null };
        }),
        then: vi.fn().mockImplementation((resolve) => {
          if (table === 'user_goals') {
            return resolve({ data: [{ goal_type: 'WEIGHT_LOSS', target_value: 70 }], error: null });
          }
          if (table === 'recovery_logs') {
            return resolve({ data: [{ readiness_score: 85, sleep_hours: 8 }], error: null });
          }
          if (table === 'ai_conversations') {
            return resolve({ data: [{ id: 'conv-101', title: 'Chest Workout Discussion' }], error: null });
          }
          if (table === 'ai_messages') {
            return resolve({ data: [{ role: 'user', content: 'Hello' }], error: null });
          }
          return resolve({ data: [], error: null });
        }),
      };
    }),
  };
  return { supabase: mockDb, supabaseAdmin: mockDb };
});

describe('Phase 6A — TRINETRA Runtime & AI Operating System Suite', () => {

  describe('1. ContextBuilder', () => {
    it('builds context and formats clean summary', async () => {
      const mockSupabase: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { readiness_score: 90, sleep_hours: 8 } }),
          then: vi.fn().mockImplementation((resolve) => resolve({ data: [{ goal_type: 'STRENGTH', target_value: 100 }] })),
        }),
      };

      const builder = new ContextBuilder(mockSupabase);
      const ctx = await builder.buildContext('usr-1');
      expect(ctx.userId).toBe('usr-1');

      const summary = builder.formatContextSummary(ctx);
      expect(summary).toContain('=== USER FITNESS CONTEXT ===');
    });
  });

  describe('2. PromptComposer', () => {
    it('composes system prompt identifying as TRINETRA', () => {
      const composer = new PromptComposer();
      const prompt = composer.composeSystemPrompt('Context: Member active', 'Memory: Prefers bar squat');
      expect(prompt).toContain('You are TRINETRA');
      expect(prompt).toContain('Context: Member active');
      expect(prompt).toContain('Memory: Prefers bar squat');
    });
  });

  describe('3. ToolRegistry & 12 Canonical Tools', () => {
    it('registers and retrieves all 12 canonical tools', () => {
      const registry = new ToolRegistry();
      const mockIdentity: any = { getProfile: vi.fn(), getFitnessProfile: vi.fn() };
      const mockWorkout: any = { getTodayWorkout: vi.fn(), createPlan: vi.fn() };
      const mockNutrition: any = { getDailySummary: vi.fn(), createMealLog: vi.fn() };
      const mockProgress: any = { getStatistics: vi.fn(), getSnapshots: vi.fn() };
      const mockSupabase: any = {};

      registry.register(new GetProfileTool(mockIdentity));
      registry.register(new GetGoalsTool(mockSupabase));
      registry.register(new GetTodayWorkoutTool(mockWorkout));
      registry.register(new GetProgressTool(mockProgress));
      registry.register(new GetNutritionTool(mockNutrition));
      registry.register(new GetRecoveryTool(mockSupabase));
      registry.register(new CreateWorkoutTool(mockWorkout));
      registry.register(new ModifyWorkoutTool(mockWorkout));
      registry.register(new LogWorkoutToolImpl(mockWorkout));
      registry.register(new LogMealTool(mockNutrition));
      registry.register(new LogWaterTool(mockNutrition));
      registry.register(new UpdateGoalTool(mockSupabase));

      expect(registry.listTools().length).toBe(12);
      expect(registry.getTool('get_profile')).toBeDefined();
      expect(registry.getTool('log_meal')).toBeDefined();
      expect(registry.getAllDefinitions().length).toBe(12);
    });
  });

  describe('4. Tool Permissions & Security Guards (ToolPermissionEngine)', () => {
    it('denies tool execution if user tries to spoof user_id in input payload', () => {
      const engine = new ToolPermissionEngine();
      const mockTool: any = { name: 'modify_workout' };

      const res = engine.validateToolExecution(
        mockTool,
        { userId: 'usr-member-a', userRole: 'Member' },
        { user_id: 'usr-victim-b', state: 'completed' }
      );

      expect(res.isFailure()).toBe(true);
      if (res.isFailure()) {
        expect(res.error.message).toContain('Cross-user modification denied');
      }
    });

    it('denies execution if user role is insufficient for restricted tool', () => {
      const engine = new ToolPermissionEngine();
      const mockTool: any = { name: 'admin_override', requiredRole: 'Gym Manager' };

      const res = engine.validateToolExecution(
        mockTool,
        { userId: 'usr-member-a', userRole: 'Member' },
        {}
      );

      expect(res.isFailure()).toBe(true);
      if (res.isFailure()) {
        expect(res.error.message).toContain('unauthorized to execute tool');
      }
    });
  });

  describe('5. ConversationManager', () => {
    it('creates and appends messages to conversation', async () => {
      const mockSupabase: any = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: async () => ({ data: { id: 'conv-200', title: 'Test Conv' }, error: null }),
            }),
          }),
        }),
      };

      const manager = new ConversationManager(mockSupabase);
      const res = await manager.createConversation('usr-1', 'Test Conv');
      expect(res.isSuccess()).toBe(true);
      if (res.isSuccess()) {
        expect(res.value.id).toBe('conv-200');
      }
    });
  });

  describe('6. Provider Error Hierarchy', () => {
    it('instantiates custom AI provider errors with status codes and categories', () => {
      const configErr = new AIProviderConfigError();
      expect((configErr as any).statusCode).toBe(500);
      expect(configErr.category).toBe('CONFIG_ERROR');

      const rateErr = new AIProviderRateLimitError();
      expect((rateErr as any).statusCode).toBe(429);
      expect(rateErr.category).toBe('RATE_LIMIT_ERROR');

      const netErr = new AIProviderNetworkError();
      expect((netErr as any).statusCode).toBe(503);

      const modelErr = new AIModelNotFoundError();
      expect((modelErr as any).statusCode).toBe(404);

      const contextErr = new AIContextExceededError();
      expect((contextErr as any).statusCode).toBe(400);

      const serviceErr = new AIServiceUnavailableError();
      expect((serviceErr as any).statusCode).toBe(503);
    });
  });

  describe('7. Streaming Endpoint (SSE & Conversation APIs)', () => {
    it('handles conversation list GET /api/v1/ai/conversations', async () => {
      const res = await request(app)
        .get('/api/v1/ai/conversations')
        .set('Authorization', 'Bearer token-valid-member');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects unauthenticated calls to POST /api/v1/ai/chat (401)', async () => {
      const res = await request(app).post('/api/v1/ai/chat').send({ message: 'Hello' });
      expect(res.status).toBe(401);
    });
  });
});
