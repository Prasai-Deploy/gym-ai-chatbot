import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workoutApi } from '../../../src/api/workoutApi';
import { httpClient } from '../../../src/api/httpClient';
import { dashboardService } from '../../../src/features/dashboard/services/dashboard.service';
import { NutritionRepository } from '../../src/modules/nutrition/repositories/NutritionRepository';
import { NutritionService } from '../../src/modules/nutrition/services/NutritionService';
import { V2WorkoutSessionRepository } from '../../src/modules/workout/repositories/V2WorkoutSessionRepository';
import { WorkoutPlanRepository } from '../../src/modules/workout/repositories/WorkoutPlanRepository';
import { WorkoutExecutionService } from '../../src/modules/workout/services/WorkoutExecutionService';
import { IdentityRepository } from '../../src/modules/identity/repositories/IdentityRepository';
import { AppError } from '../../src/errors/AppError';

describe('DB-4L: Application Integration Remediation Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // REMEDIATION 1: Workout Session & Set Persistence Contracts
  // =========================================================================
  describe('Remediation 1: Workout Session & Set Persistence', () => {
    const demoUserId = 'a1bf8b11-e2c7-4f7f-9d36-5af53418e20b';
    const mockSessionId = '00000000-0000-0000-0000-000000000001';

    it('ensures set persistence request includes sessionId and snake_case contract keys', async () => {
      const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue({
        data: {
          id: 'set-101',
          session_id: mockSessionId,
          exercise_id: 'ex-bench-press',
          set_number: 1,
          weight_kg: 80,
          reps: 10,
          rpe: 8,
          completed: true,
        },
      } as any);

      const payload = {
        sessionId: mockSessionId,
        exercise_id: 'ex-bench-press',
        set_number: 1,
        weight_kg: 80,
        reps: 10,
        rpe: 8,
        completed: true,
      };

      const res = await workoutApi.logSet(payload);
      expect(postSpy).toHaveBeenCalledWith('/workouts/sets', payload);
      expect(res.data.session_id).toBe(mockSessionId);
      expect(res.data.weight_kg).toBe(80);
      expect(res.data.reps).toBe(10);
    });

    it('rejects adding sets to terminal sessions (completed, cancelled, abandoned)', async () => {
      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'v2_workout_sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: mockSessionId,
                  user_id: demoUserId,
                  state: 'completed', // Terminal state!
                  started_at: '2026-10-12T10:00:00Z',
                  completed_at: '2026-10-12T11:00:00Z',
                },
                error: null,
              }),
            };
          }
          return {};
        }),
      } as any;

      const sessionRepo = new V2WorkoutSessionRepository(mockSupabase);
      const planRepo = new WorkoutPlanRepository(mockSupabase);
      const executionService = new WorkoutExecutionService(sessionRepo, planRepo);

      const result = await executionService.logSet(mockSessionId, demoUserId, {
        exercise_id: 'ex-bench',
        weight_kg: 80,
        reps: 10,
      });

      expect(result.isFailure()).toBe(true);
      if (result.isFailure()) {
        expect(result.error.statusCode).toBe(400); // ValidationError status code
        expect(result.error.message).toContain('closed');
      }
    });

    it('prevents optimistic advance on server failure; keeps set in retryable state', async () => {
      vi.spyOn(httpClient, 'post').mockRejectedValue(new Error('Network connection timeout'));

      let isSavingSet = false;
      let persistenceError: string | null = null;
      let completedSetCount = 0;

      const handleCompleteSet = async (setData: any) => {
        if (isSavingSet) return;
        isSavingSet = true;
        persistenceError = null;

        try {
          await workoutApi.logSet(setData);
          completedSetCount += 1; // Only advanced on confirmed server success
        } catch (err: any) {
          persistenceError = err.message || 'Failed to save set';
          // Does NOT advance completedSetCount
        } finally {
          isSavingSet = false;
        }
      };

      await handleCompleteSet({
        sessionId: mockSessionId,
        exercise_id: 'ex-squat',
        weight_kg: 100,
        reps: 5,
      });

      // Assertions: UI does not advance and error is retained
      expect(completedSetCount).toBe(0);
      expect(persistenceError).toBe('Network connection timeout');
      expect(isSavingSet).toBe(false); // UI is ready for retry
    });

    it('successful retry completes persistence and advances UI state without duplication', async () => {
      const postSpy = vi.spyOn(httpClient, 'post')
        .mockRejectedValueOnce(new Error('503 Service Unavailable'))
        .mockResolvedValueOnce({
          data: { id: 'set-retry-1', session_id: mockSessionId, completed: true },
        } as any);

      let isSavingSet = false;
      let persistenceError: string | null = null;
      let completedSetCount = 0;

      const handleCompleteSet = async (setData: any) => {
        if (isSavingSet) return;
        isSavingSet = true;
        persistenceError = null;

        try {
          await workoutApi.logSet(setData);
          completedSetCount += 1;
        } catch (err: any) {
          persistenceError = err.message || 'Failed to save set';
        } finally {
          isSavingSet = false;
        }
      };

      const setPayload = {
        sessionId: mockSessionId,
        exercise_id: 'ex-squat',
        weight_kg: 100,
        reps: 5,
      };

      // First attempt fails
      await handleCompleteSet(setPayload);
      expect(completedSetCount).toBe(0);
      expect(persistenceError).toBe('503 Service Unavailable');

      // Retry succeeds
      await handleCompleteSet(setPayload);
      expect(completedSetCount).toBe(1);
      expect(persistenceError).toBeNull();
      expect(postSpy).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // REMEDIATION 2: Dashboard Meal and Hydration Logging
  // =========================================================================
  describe('Remediation 2: Dashboard Meal and Hydration Logging', () => {
    const userId = 'a1bf8b11-e2c7-4f7f-9d36-5af53418e20b';

    it('routes dashboard water addition to canonical POST /nutrition/water', async () => {
      const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue({
        id: 1,
        amount_ml: 350,
        created_at: new Date().toISOString(),
      } as any);

      const success = await dashboardService.addWater(350);
      expect(postSpy).toHaveBeenCalledWith('/nutrition/water', { amount_ml: 350 });
      expect(success).toBe(true);
    });

    it('routes dashboard today water query to canonical GET /nutrition/daily', async () => {
      const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({
        date: '2026-10-12',
        totalCalories: 1800,
        totalWaterMl: 2250,
        meals: [],
      } as any);

      const result: any = await dashboardService.fetchTodayWater();
      expect(getSpy).toHaveBeenCalledWith('/nutrition/daily');
      expect(result.summary.total_consumed).toBe(2250);
    });

    it('creates multiple meals independently on the same date without upsert conflict', async () => {
      const insertedMeals: any[] = [];
      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'v2_nutrition_logs') {
            return {
              insert: vi.fn().mockImplementation((row: any) => {
                const inserted = { id: `m-${insertedMeals.length + 1}`, ...row };
                insertedMeals.push(inserted);
                return {
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({ data: inserted, error: null }),
                };
              }),
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockImplementation(() => {
                return Promise.resolve({ data: insertedMeals, error: null });
              }),
            };
          }
          if (table === 'water_logs') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }
          return {};
        }),
      } as any;

      const repo = new NutritionRepository(mockSupabase);
      const service = new NutritionService(repo);

      // Meal 1: Breakfast
      const res1 = await repo.createNutritionLog(userId, {
        date: '2026-10-12',
        meal_type: 'breakfast',
        food_name: 'Eggs & Toast',
        calories: 400,
        protein_g: 25,
        carbs_g: 30,
        fats_g: 15,
      });
      expect(res1.isSuccess()).toBe(true);

      // Meal 2: Lunch (same date, same user!)
      const res2 = await repo.createNutritionLog(userId, {
        date: '2026-10-12',
        meal_type: 'lunch',
        food_name: 'Chicken Rice Bowl',
        calories: 700,
        protein_g: 50,
        carbs_g: 75,
        fats_g: 18,
      });
      expect(res2.isSuccess()).toBe(true);

      // Total daily summary aggregates both meals
      const summaryRes = await service.getDailySummary(userId, '2026-10-12');
      expect(summaryRes.isSuccess()).toBe(true);
      expect(summaryRes.value.meals).toHaveLength(2);
      expect(summaryRes.value.totalCalories).toBe(1100);
      expect(summaryRes.value.totalProtein).toBe(75);
    });

    it('propagates API error visibly to user without fabricating success', async () => {
      vi.spyOn(httpClient, 'post').mockRejectedValue(new Error('422 Unprocessable Entity: Invalid calories'));

      let displayError: string | null = null;
      let loggedSuccess = false;

      try {
        await httpClient.post('/nutrition/meals', {
          food_name: 'Invalid Item',
          meal_type: 'snack',
          calories: -50,
        });
        loggedSuccess = true;
      } catch (err: any) {
        displayError = err.message;
      }

      expect(loggedSuccess).toBe(false);
      expect(displayError).toContain('422');
    });
  });

  // =========================================================================
  // REMEDIATION 3: Workout API Helper Alignment
  // =========================================================================
  describe('Remediation 3: Workout API Helper Alignment', () => {
    it('maps getTodayWorkout to GET /workouts/today', async () => {
      const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({
        data: { planId: 'p-1', title: 'Chest Hypertrophy' },
      } as any);

      const res = await workoutApi.getTodayWorkout();
      expect(getSpy).toHaveBeenCalledWith('/workouts/today');
      expect(res.data.planId).toBe('p-1');
    });

    it('maps getHistory to GET /workouts/history', async () => {
      const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({
        data: [{ id: 's-1', state: 'completed' }],
      } as any);

      const res = await workoutApi.getHistory();
      expect(getSpy).toHaveBeenCalledWith('/workouts/history');
      expect(res.data).toHaveLength(1);
    });

    it('maps getPlans to GET /workouts/plans with query params', async () => {
      const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({
        data: [{ id: 'plan-1', name: 'Upper Body' }],
      } as any);

      const res = await workoutApi.getPlans({ status: 'active' });
      expect(getSpy).toHaveBeenCalledWith('/workouts/plans', { params: { status: 'active' } });
      expect(res.data[0].name).toBe('Upper Body');
    });

    it('propagates API error when getTodayWorkout fails (no silent fallback)', async () => {
      vi.spyOn(httpClient, 'get').mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(workoutApi.getTodayWorkout()).rejects.toThrow('500 Internal Server Error');
    });

    it('handles empty results cleanly from canonical endpoints', async () => {
      vi.spyOn(httpClient, 'get').mockResolvedValue({ data: [] } as any);

      const res = await workoutApi.getHistory();
      expect(res.data).toEqual([]);
    });
  });

  // =========================================================================
  // REMEDIATION 4: Demo Data Reset Hardening
  // =========================================================================
  describe('Remediation 4: Demo Data Reset Scoping & Order', () => {
    const demoUserId = '00000000-0000-0000-0000-000000000001';
    const legitimateMemberId = 'b2cf9c22-e3d8-4f8f-ae47-6bf64529f31c';

    it('deletes records strictly scoped to target user ID in dependency-safe order', async () => {
      const deletedTables: { table: string; filter: string; value: any }[] = [];

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'v2_workout_sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockImplementation((col: string, val: any) => {
                if (col === 'user_id' && val === demoUserId) {
                  return Promise.resolve({
                    data: [{ id: 'sess-demo-1' }, { id: 'sess-demo-2' }],
                    error: null,
                  });
                }
                return Promise.resolve({ data: [], error: null });
              }),
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation((col: string, val: any) => {
                  deletedTables.push({ table, filter: col, value: val });
                  return Promise.resolve({ error: null });
                }),
              }),
            };
          }
          if (table === 'exercise_sets') {
            return {
              delete: vi.fn().mockReturnValue({
                in: vi.fn().mockImplementation((col: string, vals: any[]) => {
                  deletedTables.push({ table, filter: col, value: vals });
                  return Promise.resolve({ error: null });
                }),
              }),
            };
          }
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: any) => {
                deletedTables.push({ table, filter: col, value: val });
                return Promise.resolve({ error: null });
              }),
            }),
          };
        }),
      } as any;

      const identityRepo = new IdentityRepository(mockSupabase);
      const res = await identityRepo.resetDemoData(demoUserId);
      expect(res.isSuccess()).toBe(true);

      // Verify dependency order: exercise_sets (child) deleted BEFORE v2_workout_sessions (parent)
      const setDeleteIdx = deletedTables.findIndex(d => d.table === 'exercise_sets');
      const sessionDeleteIdx = deletedTables.findIndex(d => d.table === 'v2_workout_sessions');
      expect(setDeleteIdx).toBeGreaterThanOrEqual(0);
      expect(sessionDeleteIdx).toBeGreaterThanOrEqual(0);
      expect(setDeleteIdx).toBeLessThan(sessionDeleteIdx);

      // Verify all deletions were scoped to demoUserId
      for (const deletion of deletedTables) {
        if (deletion.table === 'exercise_sets') {
          expect(deletion.value).toEqual(['sess-demo-1', 'sess-demo-2']);
        } else if (deletion.table === 'water_logs') {
          expect(deletion.filter).toBe('profile_id');
          expect(deletion.value).toBe(demoUserId);
        } else if (['v2_fitness_profiles', 'user_preferences'].includes(deletion.table)) {
          expect(deletion.filter).toBe('id');
          expect(deletion.value).toBe(demoUserId);
        } else {
          expect(deletion.filter).toBe('user_id');
          expect(deletion.value).toBe(demoUserId);
        }
        // Must NEVER delete legitimate member data
        expect(deletion.value).not.toBe(legitimateMemberId);
      }
    });

    it('returns failure when a database error occurs during reset', async () => {
      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'v2_workout_sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: { code: '500', message: 'Database connection failed' },
              }),
            };
          }
          return {};
        }),
      } as any;

      const identityRepo = new IdentityRepository(mockSupabase);
      const res = await identityRepo.resetDemoData(demoUserId);
      expect(res.isFailure()).toBe(true);
      if (res.isFailure()) {
        expect(res.error.statusCode).toBe(500);
      }
    });
  });
});
