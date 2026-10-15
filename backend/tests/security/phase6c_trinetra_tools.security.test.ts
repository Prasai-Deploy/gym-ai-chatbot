import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolRegistry, toolRegistry } from '../../src/modules/ai/tools/ToolRegistry';
import { ToolExecutor } from '../../src/modules/ai/core/ToolExecutor';
import { ToolPermissionEngine } from '../../src/modules/ai/safety/ToolPermissionEngine';
import { ToolContext } from '../../src/modules/ai/tools/BaseTool';
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
import { ok, fail } from '../../src/shared/core/Result';
import { AppError } from '../../src/errors/AppError';

describe('Phase 6C TRINETRA Production Tool Executors & Safety Suite', () => {
  const userA = 'user-uuid-1111';
  const userB = 'user-uuid-2222';
  const org1 = 'org-uuid-aaaa';
  const org2 = 'org-uuid-bbbb';

  const memberCtx: ToolContext = {
    userId: userA,
    organizationId: org1,
    userRole: 'Member',
  };

  const demoUserCtx: ToolContext = {
    userId: userA,
    organizationId: org1,
    userRole: 'Demo User',
  };

  let mockIdentityService: any;
  let mockWorkoutService: any;
  let mockNutritionService: any;
  let mockProgressService: any;
  let mockSupabase: any;
  let permissionEngine: ToolPermissionEngine;

  beforeEach(() => {
    permissionEngine = new ToolPermissionEngine();

    mockIdentityService = {
      getProfile: vi.fn().mockResolvedValue(ok({ id: userA, full_name: 'Member One', email: 'one@test.com' })),
      getFitnessProfile: vi.fn().mockResolvedValue(ok({ level: 'intermediate', height_cm: 180, target_weight_kg: 75 })),
    };

    mockWorkoutService = {
      getTodayWorkout: vi.fn().mockResolvedValue(ok({ latestPlan: { title: 'Chest Day' }, activeSession: null })),
      createPlan: vi.fn().mockImplementation((userId, data) =>
        ok({ id: 'plan-123', userId, title: data.title, status: 'ACTIVE' })
      ),
      updatePlan: vi.fn().mockImplementation((planId, userId, data) =>
        ok({ id: planId, userId, title: data.title })
      ),
      transitionSessionState: vi.fn().mockImplementation((sessionId, userId, data) =>
        ok({ id: sessionId, userId, state: data.state })
      ),
      startSession: vi.fn().mockImplementation((userId, planId, name) =>
        ok({ id: 'sess-456', userId, state: 'IN_PROGRESS', name })
      ),
      logSet: vi.fn().mockImplementation((sessionId, userId, data) =>
        ok({ id: 'set-789', sessionId, userId, ...data })
      ),
    };

    mockNutritionService = {
      getDailySummary: vi.fn().mockResolvedValue(ok({ totalCalories: 2200, totalProtein: 150, totalCarbs: 200, totalFats: 70, totalWaterMl: 2500 })),
      createMealLog: vi.fn().mockImplementation((userId, data) =>
        ok({ id: 'meal-123', userId, ...data })
      ),
      addWaterLog: vi.fn().mockImplementation((userId, data) =>
        ok({ id: 'water-123', userId, amount_ml: data.amount_ml })
      ),
    };

    mockProgressService = {
      getStatistics: vi.fn().mockResolvedValue(ok({ workout_count: 12, current_streak: 4 })),
      getSnapshots: vi.fn().mockResolvedValue(ok([{ date: '2026-09-17', weight_kg: 75 }])),
    };

    mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: [{ id: 'goal-1', goal_type: 'build_muscle', target_value: 80 }], error: null }),
            order: () => ({
              limit: () => Promise.resolve({ data: [{ date: '2026-09-17', readiness_score: 85 }], error: null }),
            }),
          }),
        }),
        upsert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'goal-1', goal_type: 'build_muscle' }, error: null }),
          }),
        }),
      })),
    };
  });

  describe('1. Registration & Registry Integrity', () => {
    it('verifies all 12 canonical TRINETRA tools are registered', () => {
      const registry = new ToolRegistry();
      registry.register(new GetProfileTool(mockIdentityService));
      registry.register(new GetGoalsTool(mockSupabase));
      registry.register(new GetTodayWorkoutTool(mockWorkoutService));
      registry.register(new GetProgressTool(mockProgressService));
      registry.register(new GetNutritionTool(mockNutritionService));
      registry.register(new GetRecoveryTool(mockSupabase));
      registry.register(new CreateWorkoutTool(mockWorkoutService));
      registry.register(new ModifyWorkoutTool(mockWorkoutService));
      registry.register(new LogWorkoutToolImpl(mockWorkoutService));
      registry.register(new LogMealTool(mockNutritionService));
      registry.register(new LogWaterTool(mockNutritionService));
      registry.register(new UpdateGoalTool(mockSupabase));

      const canonicalTools = [
        'get_profile',
        'get_goals',
        'get_today_workout',
        'get_progress',
        'get_nutrition',
        'get_recovery',
        'create_workout',
        'modify_workout',
        'log_workout',
        'log_meal',
        'log_water',
        'update_goal',
      ];

      const registeredNames = registry.listTools().map((t) => t.name);
      for (const name of canonicalTools) {
        expect(registeredNames).toContain(name);
      }
    });
  });

  describe('2. Read Tools Verification', () => {
    it('get_profile executes and returns structured user profile data', async () => {
      const tool = new GetProfileTool(mockIdentityService);
      const res = await tool.execute({}, memberCtx);
      expect(res.isSuccess()).toBe(true);
      if (res.isSuccess()) {
        expect(res.value.success).toBe(true);
        expect(res.value.data.profile.full_name).toBe('Member One');
      }
    });

    it('get_goals executes and returns active goals', async () => {
      const tool = new GetGoalsTool(mockSupabase);
      const res = await tool.execute({}, memberCtx);
      expect(res.isSuccess()).toBe(true);
      if (res.isSuccess()) {
        expect(res.value.success).toBe(true);
        expect(res.value.data).toHaveLength(1);
      }
    });

    it('get_today_workout executes and returns session & plan state', async () => {
      const tool = new GetTodayWorkoutTool(mockWorkoutService);
      const res = await tool.execute({}, memberCtx);
      expect(res.isSuccess()).toBe(true);
      if (res.isSuccess()) {
        expect(res.value.success).toBe(true);
        expect(res.value.data.latestPlan.title).toBe('Chest Day');
      }
    });

    it('get_progress executes and returns statistics & snapshots', async () => {
      const tool = new GetProgressTool(mockProgressService);
      const res = await tool.execute({}, memberCtx);
      expect(res.isSuccess()).toBe(true);
      if (res.isSuccess()) {
        expect(res.value.success).toBe(true);
        expect(res.value.data.statistics.workout_count).toBe(12);
      }
    });

    it('get_nutrition executes and returns daily calorie summary', async () => {
      const tool = new GetNutritionTool(mockNutritionService);
      const res = await tool.execute({ date: '2026-09-17' }, memberCtx);
      expect(res.isSuccess()).toBe(true);
      if (res.isSuccess()) {
        expect(res.value.success).toBe(true);
        expect(res.value.data.totalCalories).toBe(2200);
      }
    });

    it('get_recovery executes and returns recovery metrics', async () => {
      const tool = new GetRecoveryTool(mockSupabase);
      const res = await tool.execute({}, memberCtx);
      expect(res.isSuccess()).toBe(true);
      if (res.isSuccess()) {
        expect(res.value.success).toBe(true);
        expect(res.value.data[0].readiness_score).toBe(85);
      }
    });
  });

  describe('3. Action Tools Verification & Persistence', () => {
    it('create_workout creates workout plan and returns success envelope', async () => {
      const tool = new CreateWorkoutTool(mockWorkoutService);
      const res = await tool.execute({ title: 'Leg Day Plan' }, memberCtx);
      expect(res.isSuccess()).toBe(true);
      if (res.isSuccess()) {
        expect(res.value.success).toBe(true);
        expect(res.value.data.title).toBe('Leg Day Plan');
      }
    });

    it('log_meal logs meal and returns persisted meal log data', async () => {
      const tool = new LogMealTool(mockNutritionService);
      const res = await tool.execute({ food_name: 'Chicken Rice', calories: 650, meal_type: 'lunch' }, memberCtx);
      expect(res.isSuccess()).toBe(true);
      if (res.isSuccess()) {
        expect(res.value.success).toBe(true);
        expect(res.value.data.food_name).toBe('Chicken Rice');
      }
    });

    it('log_water logs water intake volume in ml', async () => {
      const tool = new LogWaterTool(mockNutritionService);
      const res = await tool.execute({ amount_ml: 500 }, memberCtx);
      expect(res.isSuccess()).toBe(true);
      if (res.isSuccess()) {
        expect(res.value.success).toBe(true);
        expect(res.value.data.amount_ml).toBe(500);
      }
    });

    it('log_water rejects negative or unreasonable water volume', async () => {
      const tool = new LogWaterTool(mockNutritionService);
      const resNegative = await tool.execute({ amount_ml: -100 }, memberCtx);
      expect(resNegative.isFailure()).toBe(true);

      const resExtreme = await tool.execute({ amount_ml: 50000 }, memberCtx);
      expect(resExtreme.isFailure()).toBe(true);
    });
  });

  describe('4. Security & Identity Protection (Anti-Spoofing)', () => {
    it('rejects input payloads attempting to alter user_id to userB', () => {
      const tool = new LogWaterTool(mockNutritionService);
      const input = { amount_ml: 500, user_id: userB };

      const permRes = permissionEngine.validateToolExecution(tool, memberCtx, input);
      expect(permRes.isFailure()).toBe(true);
      expect(permRes.error.message).toContain('Cross-user modification denied');
    });

    it('rejects input payloads attempting to alter organization_id to org2', () => {
      const tool = new LogWaterTool(mockNutritionService);
      const input = { amount_ml: 500, organization_id: org2 };

      const permRes = permissionEngine.validateToolExecution(tool, memberCtx, input);
      expect(permRes.isFailure()).toBe(true);
      expect(permRes.error.message).toContain('Cross-tenant access denied');
    });

    it('restricts Demo User from executing mutating action tools', () => {
      const tool = new CreateWorkoutTool(mockWorkoutService);
      const permRes = permissionEngine.validateToolExecution(tool, demoUserCtx, { title: 'Demo Plan' });

      expect(permRes.isFailure()).toBe(true);
      expect(permRes.error.message).toContain('Demo User role is restricted');
    });

    it('allows Demo User to execute read-only get_* tools', () => {
      const tool = new GetProfileTool(mockIdentityService);
      const permRes = permissionEngine.validateToolExecution(tool, demoUserCtx, {});

      expect(permRes.isSuccess()).toBe(true);
    });
  });

  describe('5. Persistence Failure Prevention (Anti-Hallucination)', () => {
    it('returns failure result envelope when database domain service fails', async () => {
      const failingNutritionService: any = {
        addWaterLog: vi.fn().mockResolvedValue(fail(new AppError('Database connection timeout', 500))),
      };

      const tool = new LogWaterTool(failingNutritionService);
      const res = await tool.execute({ amount_ml: 500 }, memberCtx);

      expect(res.isFailure()).toBe(true);
      if (res.isFailure()) {
        expect(res.error.message).toContain('Database connection timeout');
      }
    });
  });
});
