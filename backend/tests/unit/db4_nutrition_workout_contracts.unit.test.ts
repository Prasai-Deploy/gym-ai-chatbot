import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NutritionRepository } from '../../src/modules/nutrition/repositories/NutritionRepository';
import { NutritionService } from '../../src/modules/nutrition/services/NutritionService';
import { V2WorkoutSessionRepository } from '../../src/modules/workout/repositories/V2WorkoutSessionRepository';
import { WorkoutPlanRepository } from '../../src/modules/workout/repositories/WorkoutPlanRepository';
import { WorkoutExecutionService } from '../../src/modules/workout/services/WorkoutExecutionService';
import { ContextBuilder } from '../../src/modules/ai/core/ContextBuilder';
import { AppError } from '../../src/errors/AppError';

describe('DB-4C: Nutrition & Workout Repository & Service Contract Suite', () => {
  const userId = 'a1bf8b11-e2c7-4f7f-9d36-5af53418e20b';
  const otherUserId = 'b2cf9c22-e3d8-4f8f-ae47-6bf64529f31c';

  // ==========================================
  // SECTION 1: NUTRITION CONTRACTS
  // ==========================================
  describe('1. Nutrition Contracts & Multiple Meals Aggregation', () => {
    it('supports multiple meals on the same date and aggregates correctly', async () => {
      const mockMeals = [
        { id: 'm-1', user_id: userId, meal_type: 'breakfast', food_name: 'Oatmeal & Whey', calories: 450, protein_g: 35, carbs_g: 55, fats_g: 8, logged_at: '2026-10-12T08:00:00Z' },
        { id: 'm-2', user_id: userId, meal_type: 'lunch', food_name: 'Chicken Rice Bowl', calories: 650, protein_g: 50, carbs_g: 70, fats_g: 15, logged_at: '2026-10-12T13:00:00Z' },
        { id: 'm-3', user_id: userId, meal_type: 'snack', food_name: 'Greek Yogurt & Almonds', calories: 250, protein_g: 22, carbs_g: 12, fats_g: 10, logged_at: '2026-10-12T16:30:00Z' },
      ];

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'v2_nutrition_logs') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: mockMeals, error: null }),
            };
          }
          if (table === 'water_logs') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: 1, amount_ml: 500, created_at: '2026-10-12T09:00:00Z' },
                  { id: 2, amount_ml: 750, created_at: '2026-10-12T14:00:00Z' },
                ],
                error: null,
              }),
            };
          }
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [], error: null }) };
        }),
      } as any;

      const repo = new NutritionRepository(mockSupabase);
      const service = new NutritionService(repo);

      const summaryRes = await service.getDailySummary(userId, '2026-10-12');
      expect(summaryRes.isSuccess()).toBe(true);

      const summary = summaryRes.value;
      expect(summary.date).toBe('2026-10-12');
      expect(summary.totalCalories).toBe(1350); // 450 + 650 + 250
      expect(summary.totalProtein).toBe(107); // 35 + 50 + 22
      expect(summary.totalCarbs).toBe(137); // 55 + 70 + 12
      expect(summary.totalFats).toBe(33); // 8 + 15 + 10
      expect(summary.totalWaterMl).toBe(1250); // 500 + 750
      expect(summary.meals).toHaveLength(3);
    });

    it('queries and writes water_logs using profile_id UUID identity', async () => {
      let insertedWaterRow: any = null;
      let queriedColumn: string = '';

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'water_logs') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockImplementation((col: string, val: any) => {
                queriedColumn = col;
                return {
                  order: vi.fn().mockResolvedValue({
                    data: [{ id: 1, amount_ml: 500, created_at: '2026-10-12T10:00:00Z' }],
                    error: null,
                  }),
                };
              }),
              insert: vi.fn().mockImplementation((row: any) => {
                insertedWaterRow = row;
                return {
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: { id: 2, amount_ml: row.amount_ml, created_at: new Date().toISOString() },
                    error: null,
                  }),
                };
              }),
            };
          }
          return {};
        }),
      } as any;

      const repo = new NutritionRepository(mockSupabase);

      // Verify water reading targets profile_id
      const logsRes = await repo.getWaterLogs(userId, '2026-10-12');
      expect(logsRes.isSuccess()).toBe(true);
      expect(queriedColumn).toBe('profile_id');

      // Verify water writing targets profile_id
      const addRes = await repo.addWaterLog(userId, { amount_ml: 750 });
      expect(addRes.isSuccess()).toBe(true);
      expect(insertedWaterRow).toBeDefined();
      expect(insertedWaterRow.profile_id).toBe(userId);
      expect(insertedWaterRow.amount_ml).toBe(750);
    });

    it('propagates database query failure without silently returning empty meals', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '50000', message: 'connection pool timeout during nutrition query' },
          }),
        }),
      } as any;

      const repo = new NutritionRepository(mockSupabase);
      const res = await repo.getDailyLogs(userId, '2026-10-12');

      expect(res.isFailure()).toBe(true);
      expect(res.error.message).toContain('Database error querying nutrition logs');
      expect(res.error.statusCode).toBe(500);
    });
  });

  // ==========================================
  // SECTION 2: WORKOUT PLAN & SESSION LIFECYCLE
  // ==========================================
  describe('2. Workout Plan & Session Lifecycle State Transitions', () => {
    it('creates and retrieves workout plans targeting v2_workout_plans', async () => {
      let queriedTable = '';
      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          queriedTable = table;
          return {
            insert: vi.fn().mockImplementation((row: any) => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'plan-101', user_id: row.user_id, title: row.title, created_at: new Date().toISOString() },
                error: null,
              }),
            })),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'plan-101', user_id: userId, title: 'Hypertrophy Block 1' }],
              error: null,
            }),
          };
        }),
      } as any;

      const planRepo = new WorkoutPlanRepository(mockSupabase);
      const createRes = await planRepo.createPlan(userId, { title: 'Hypertrophy Block 1' });
      expect(createRes.isSuccess()).toBe(true);
      expect(queriedTable).toBe('v2_workout_plans');

      const listRes = await planRepo.getPlansForUser(userId);
      expect(listRes.isSuccess()).toBe(true);
      expect(listRes.value[0].title).toBe('Hypertrophy Block 1');
    });

    it('enforces session lifecycle transitions and rejects modifications to terminal sessions', async () => {
      let sessionState: string = 'started';
      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'v2_workout_sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockImplementation(async () => ({
                data: { id: 'session-201', user_id: userId, state: sessionState },
                error: null,
              })),
              update: vi.fn().mockImplementation((updateData: any) => {
                sessionState = updateData.state;
                return {
                  eq: vi.fn().mockReturnThis(),
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'session-201', user_id: userId, state: sessionState },
                    error: null,
                  }),
                };
              }),
            };
          }
          return {};
        }),
      } as any;

      const sessionRepo = new V2WorkoutSessionRepository(mockSupabase);
      const planRepo = new WorkoutPlanRepository(mockSupabase);
      const service = new WorkoutExecutionService(sessionRepo, planRepo);

      // 1. Transition: started -> paused
      const pauseRes = await service.transitionSessionState('session-201', userId, { state: 'paused' });
      expect(pauseRes.isSuccess()).toBe(true);
      expect(pauseRes.value.state).toBe('paused');

      // 2. Transition: paused -> started (resumed)
      const resumeRes = await service.transitionSessionState('session-201', userId, { state: 'started' });
      expect(resumeRes.isSuccess()).toBe(true);
      expect(resumeRes.value.state).toBe('started');

      // 3. Transition: started -> completed (terminal state)
      const completeRes = await service.transitionSessionState('session-201', userId, { state: 'completed' });
      expect(completeRes.isSuccess()).toBe(true);
      expect(completeRes.value.state).toBe('completed');

      // 4. Attempt to transition an already completed session -> MUST BE REJECTED
      const invalidReopenRes = await service.transitionSessionState('session-201', userId, { state: 'started' });
      expect(invalidReopenRes.isFailure()).toBe(true);
      expect(invalidReopenRes.error.message).toContain('Cannot transition a closed session');
    });

    it('enforces session ownership and prevents cross-member session operations', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'session-201', user_id: otherUserId, state: 'started' },
            error: null,
          }),
        }),
      } as any;

      const sessionRepo = new V2WorkoutSessionRepository(mockSupabase);
      const planRepo = new WorkoutPlanRepository(mockSupabase);
      const service = new WorkoutExecutionService(sessionRepo, planRepo);

      // Attempting to modify another user's session
      const res = await service.transitionSessionState('session-201', userId, { state: 'paused' });
      expect(res.isFailure()).toBe(true);
      expect(res.error.statusCode).toBe(403);
      expect(res.error.message).toContain('Forbidden: Access denied to another member session');
    });

    it('enforces session ownership when logging exercise sets', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'session-999', user_id: otherUserId, state: 'started' },
            error: null,
          }),
        }),
      } as any;

      const sessionRepo = new V2WorkoutSessionRepository(mockSupabase);
      const planRepo = new WorkoutPlanRepository(mockSupabase);
      const service = new WorkoutExecutionService(sessionRepo, planRepo);

      const res = await service.logSet('session-999', userId, { weight_kg: 100, reps: 5 });
      expect(res.isFailure()).toBe(true);
      expect(res.error.statusCode).toBe(403);
    });
  });

  // ==========================================
  // SECTION 3: TRINETRA CONTEXT & TELEMETRY
  // ==========================================
  describe('3. TRINETRA Context & Explicit Failure Telemetry', () => {
    it('sets telemetryStatus offline and formats explicit failure warning when nutrition query fails', async () => {
      const mockIdentity: any = {
        getProfile: vi.fn().mockResolvedValue({ isSuccess: () => true, value: { email: 'athlete@example.com', full_name: 'Athlete' } }),
        getFitnessProfile: vi.fn().mockResolvedValue({ isSuccess: () => true, value: { level: 'advanced' } }),
      };

      const mockWorkout: any = {
        getTodayWorkout: vi.fn().mockResolvedValue({
          isSuccess: () => true,
          value: { activeSession: { title: 'Chest Hypertrophy', state: 'started' }, latestPlan: null },
        }),
      };

      // Injected failure in nutrition service
      const mockNutrition: any = {
        getDailySummary: vi.fn().mockResolvedValue({
          isSuccess: () => false,
          error: new AppError('Database connection failure', 500),
        }),
      };

      const mockSupabase: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          then: vi.fn().mockImplementation((resolve) => resolve({ data: [], error: null })),
        }),
      };

      const builder = new ContextBuilder(mockSupabase, mockIdentity, mockWorkout, mockNutrition);
      const ctx = await builder.buildContext(userId);

      expect(ctx.telemetryStatus.nutritionOnline).toBe(false);
      expect(ctx.telemetryStatus.workoutOnline).toBe(true);
      expect(ctx.nutrition).toBeNull();

      const summary = builder.formatContextSummary(ctx);
      expect(summary).toContain('Nutrition Today: [Telemetry Offline - database query failed]');
      expect(summary).toContain("Active session 'Chest Hypertrophy' (started)");
      expect(summary).not.toContain('0 kcal consumed');
    });

    it('sets telemetryStatus offline and formats explicit failure warning when workout query fails', async () => {
      const mockIdentity: any = {
        getProfile: vi.fn().mockResolvedValue({ isSuccess: () => true, value: { email: 'athlete@example.com', full_name: 'Athlete' } }),
        getFitnessProfile: vi.fn().mockResolvedValue({ isSuccess: () => true, value: { level: 'advanced' } }),
      };

      // Injected failure in workout service
      const mockWorkout: any = {
        getTodayWorkout: vi.fn().mockResolvedValue({
          isSuccess: () => false,
          error: new AppError('Database schema lock error', 500),
        }),
      };

      const mockNutrition: any = {
        getDailySummary: vi.fn().mockResolvedValue({
          isSuccess: () => true,
          value: { totalCalories: 2100, totalProtein: 160, totalCarbs: 220, totalFats: 65, totalWaterMl: 3000 },
        }),
      };

      const mockSupabase: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          then: vi.fn().mockImplementation((resolve) => resolve({ data: [], error: null })),
        }),
      };

      const builder = new ContextBuilder(mockSupabase, mockIdentity, mockWorkout, mockNutrition);
      const ctx = await builder.buildContext(userId);

      expect(ctx.telemetryStatus.workoutOnline).toBe(false);
      expect(ctx.telemetryStatus.nutritionOnline).toBe(true);
      expect(ctx.todayWorkout).toBeNull();

      const summary = builder.formatContextSummary(ctx);
      expect(summary).toContain('Today Workout: [Telemetry Offline - database query failed]');
      expect(summary).toContain('Nutrition Today: 2100 kcal consumed');
    });
  });
});
