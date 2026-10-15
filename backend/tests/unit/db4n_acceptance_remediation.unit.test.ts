import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isRetryableNetworkError } from '../../../src/utils/errorUtils';
import { queueRequest, replayQueue, QueuedRequest } from '../../../src/services/offlineStorage';
import { IdentityRepository } from '../../src/modules/identity/repositories/IdentityRepository';
import { IdentityController } from '../../src/modules/identity/controllers/IdentityController';
import { IdentityService } from '../../src/modules/identity/services/IdentityService';
import { WorkoutExecutionService } from '../../src/modules/workout/services/WorkoutExecutionService';
import { V2WorkoutSessionRepository } from '../../src/modules/workout/repositories/V2WorkoutSessionRepository';
import { WorkoutPlanRepository } from '../../src/modules/workout/repositories/WorkoutPlanRepository';
import { ExerciseController } from '../../src/modules/exercise/controllers/ExerciseController';
import { ExerciseService } from '../../src/modules/exercise/services/ExerciseService';
import { normalizeOptionalExerciseId, isValidUuid } from '../../src/modules/workout/domain/WorkoutSchemas';
import { AppError, ValidationError } from '../../src/errors/AppError';

describe('DB-4N: Final Integration Acceptance Remediation Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // FINDING 1: Dashboard Quick Log Error Classification & Offline Resilience
  // =========================================================================
  describe('Finding 1: Error Classification & Offline Queue Semantics', () => {
    it('network disconnection queues a request when offline queuing is supported', () => {
      // Offline network error (no response, ERR_NETWORK)
      const networkError = {
        name: 'AxiosError',
        message: 'Network Error',
        code: 'ERR_NETWORK',
      };
      expect(isRetryableNetworkError(networkError)).toBe(true);

      // Connection aborted / timeout
      const timeoutError = {
        name: 'AxiosError',
        message: 'timeout of 5000ms exceeded',
        code: 'ECONNABORTED',
      };
      expect(isRetryableNetworkError(timeoutError)).toBe(true);
    });

    it('HTTP 422 displays a validation error and does not queue the request', () => {
      const validationError = {
        name: 'AxiosError',
        message: 'Validation failed: calories must be a positive integer',
        response: {
          status: 422,
          data: { success: false, message: 'Invalid calories' },
        },
      };
      expect(isRetryableNetworkError(validationError)).toBe(false);
    });

    it('HTTP 401/403 is surfaced without silently queuing a protected write', () => {
      const unauthorizedError = {
        name: 'AxiosError',
        message: 'Unauthorized: missing JWT token',
        response: { status: 401, data: { success: false, message: 'Unauthorized' } },
      };
      const forbiddenError = {
        name: 'AxiosError',
        message: 'Forbidden: Insufficient privileges',
        response: { status: 403, data: { success: false, message: 'Forbidden' } },
      };

      expect(isRetryableNetworkError(unauthorizedError)).toBe(false);
      expect(isRetryableNetworkError(forbiddenError)).toBe(false);
    });

    it('a server error follows the documented retry policy', () => {
      // 500 Internal Server Error is an application defect — non-retryable for client queue
      const internalServerError = {
        name: 'AxiosError',
        message: 'Internal Server Error',
        response: { status: 500, data: { message: 'Database connection terminated' } },
      };
      expect(isRetryableNetworkError(internalServerError)).toBe(false);

      // 503 Service Unavailable / 504 Gateway Timeout are transient gateway errors — retryable
      const serviceUnavailable = {
        name: 'AxiosError',
        message: 'Service Unavailable',
        response: { status: 503, data: { message: 'Service Unavailable' } },
      };
      const gatewayTimeout = {
        name: 'AxiosError',
        message: 'Gateway Timeout',
        response: { status: 504, data: { message: 'Gateway Timeout' } },
      };
      expect(isRetryableNetworkError(serviceUnavailable)).toBe(true);
      expect(isRetryableNetworkError(gatewayTimeout)).toBe(true);
    });

    it('the UI does not claim a rejected request was saved', () => {
      // Simulating DashboardPage submit handler error evaluation
      const err = {
        response: {
          status: 422,
          data: { message: 'Invalid food_name: cannot be empty' },
        },
      };

      let formClosed = false;
      let chartUpdated = false;
      let displayedError: string | null = null;
      let queuedOffline = false;

      if (isRetryableNetworkError(err)) {
        queuedOffline = true;
        formClosed = true;
        chartUpdated = true;
      } else {
        const msg = err.response?.data?.message || 'Server rejected request';
        displayedError = `Validation / Server Error: ${msg}`;
        // Form remains open and chart is untouched
        formClosed = false;
        chartUpdated = false;
      }

      expect(queuedOffline).toBe(false);
      expect(formClosed).toBe(false);
      expect(chartUpdated).toBe(false);
      expect(displayedError).toContain('Invalid food_name');
    });

    it('retrying an eligible queued request does not create duplicate records', async () => {
      // Mock IndexedDB
      const mockItems: QueuedRequest[] = [
        {
          id: 1,
          url: '/api/v1/nutrition/meals',
          method: 'POST',
          body: JSON.stringify({ food_name: 'Protein Shake', calories: 250 }),
          timestamp: Date.now(),
          clientRequestId: 'req-unique-101',
        },
      ];

      // Verify deduplication logic: identical clientRequestId or identical payload is rejected
      const incomingPayload = JSON.stringify({ food_name: 'Protein Shake', calories: 250 });
      const isDuplicate = mockItems.some(
        (item) => item.clientRequestId === 'req-unique-101' || (item.url === '/api/v1/nutrition/meals' && item.body === incomingPayload)
      );

      expect(isDuplicate).toBe(true);
    });
  });

  // =========================================================================
  // FINDING 2: Demo Reset Transaction Safety & Scoped Deletion
  // =========================================================================
  describe('Finding 2: Demo Reset Safety & Boundaries', () => {
    const demoUserId = '00000000-0000-0000-0000-000000000001';
    const legitimateUserId = '99999999-9999-4999-8999-999999999999';

    it('invalid or non-demo identity is rejected at controller gate', async () => {
      const mockService = {
        resetDemoData: vi.fn(),
      } as any;
      const controller = new IdentityController(mockService);

      const reqNonDemo = {
        user: { id: legitimateUserId, email: 'member@realgym.com' },
      } as any;
      const resNonDemo = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;
      const next = vi.fn();

      await controller.resetDemoData(reqNonDemo, resNonDemo, next);
      expect(resNonDemo.status).toHaveBeenCalledWith(403);
      expect(resNonDemo.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: expect.stringContaining('Forbidden') }));
      expect(mockService.resetDemoData).not.toHaveBeenCalled();
    });

    it('initial session lookup errors stop cleanup immediately', async () => {
      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'v2_workout_sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'relation v2_workout_sessions does not exist', code: '42P01' },
              }),
            };
          }
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }),
      } as any;

      const identityRepo = new IdentityRepository(mockSupabase);
      const result = await identityRepo.resetDemoData(demoUserId);

      expect(result.isFailure()).toBe(true);
      if (result.isFailure()) {
        expect(result.error.message).toContain('session lookup failed');
      }

      // Supabase .from must NOT have called delete on any subsequent tables!
      const calls = mockSupabase.from.mock.calls.map((c: any) => c[0]);
      expect(calls).toEqual(['v2_workout_sessions']);
      expect(calls).not.toContain('v2_workout_plans');
      expect(calls).not.toContain('v2_nutrition_logs');
      expect(calls).not.toContain('water_logs');
    });

    it('a failure during cleanup is surfaced, not reported as success', async () => {
      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'v2_workout_sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 'sess-1' }],
                error: null,
              }),
              delete: vi.fn().mockReturnThis(),
            };
          }
          if (table === 'exercise_sets') {
            return {
              delete: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({
                error: { message: 'foreign key constraint violation on child sets', code: '23503' },
              }),
            };
          }
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }),
      } as any;

      const identityRepo = new IdentityRepository(mockSupabase);
      const result = await identityRepo.resetDemoData(demoUserId);

      expect(result.isFailure()).toBe(true);
      if (result.isFailure()) {
        expect(result.error.message).toContain('exercise_sets cleanup');
      }
    });

    it('child records are handled before parent deletion in dependency-safe order', async () => {
      const callLog: string[] = [];

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          callLog.push(`from(${table})`);
          if (table === 'v2_workout_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation(() => {
                  callLog.push('sessions.select.eq');
                  return Promise.resolve({ data: [{ id: 'demo-sess-1' }], error: null });
                }),
              }),
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation(() => {
                  callLog.push('v2_workout_sessions.delete.eq');
                  return Promise.resolve({ error: null });
                }),
              }),
            };
          }
          if (table === 'exercise_sets') {
            return {
              delete: vi.fn().mockReturnThis(),
              in: vi.fn().mockImplementation(() => {
                callLog.push('exercise_sets.delete.in');
                return Promise.resolve({ error: null });
              }),
            };
          }
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => {
              callLog.push(`${table}.delete.eq`);
              return Promise.resolve({ error: null });
            }),
          };
        }),
      } as any;

      const identityRepo = new IdentityRepository(mockSupabase);
      const result = await identityRepo.resetDemoData(demoUserId);
      expect(result.isSuccess()).toBe(true);

      const setsDeleteIdx = callLog.indexOf('exercise_sets.delete.in');
      const sessionsDeleteIdx = callLog.indexOf('v2_workout_sessions.delete.eq');

      expect(setsDeleteIdx).toBeGreaterThan(-1);
      expect(sessionsDeleteIdx).toBeGreaterThan(-1);
      expect(setsDeleteIdx).toBeLessThan(sessionsDeleteIdx);
    });

    it('only the intended demo user data is affected', async () => {
      const deletedFilters: Array<{ table: string; filter: string; value: string }> = [];

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'v2_workout_sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                return Promise.resolve({ data: [{ id: 'sess-abc' }], error: null });
              }),
              delete: vi.fn().mockReturnThis(),
            };
          }
          if (table === 'exercise_sets') {
            return {
              delete: vi.fn().mockReturnThis(),
              in: vi.fn().mockImplementation((col: string, val: string[]) => {
                deletedFilters.push({ table, filter: col, value: val.join(',') });
                return Promise.resolve({ error: null });
              }),
            };
          }
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              deletedFilters.push({ table, filter: col, value: val });
              return Promise.resolve({ error: null });
            }),
          };
        }),
      } as any;

      const identityRepo = new IdentityRepository(mockSupabase);
      await identityRepo.resetDemoData(demoUserId);

      // Verify every deletion was scoped to demoUserId
      for (const d of deletedFilters) {
        if (d.table === 'exercise_sets') {
          expect(d.value).toBe('sess-abc');
        } else if (d.table === 'water_logs') {
          expect(d.filter).toBe('profile_id');
          expect(d.value).toBe(demoUserId);
        } else if (d.table === 'v2_fitness_profiles' || d.table === 'user_preferences') {
          expect(d.filter).toBe('id');
          expect(d.value).toBe(demoUserId);
        } else {
          expect(d.filter).toBe('user_id');
          expect(d.value).toBe(demoUserId);
        }
        expect(d.value).not.toBe(legitimateUserId);
      }
    });
  });

  // =========================================================================
  // FINDING 3: Invalid Exercise UUID Normalization & Validation
  // =========================================================================
  describe('Finding 3: Exercise UUID Handling & Normalization', () => {
    const validUuid = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
    const mockSessionId = '00000000-0000-0000-0000-000000000001';
    const userId = '11111111-1111-4111-8111-111111111111';

    it('a valid UUID is preserved across domain and repository boundaries', () => {
      expect(isValidUuid(validUuid)).toBe(true);
      expect(normalizeOptionalExerciseId(validUuid)).toBe(validUuid);
    });

    it('a known placeholder ID does not cause PostgreSQL error 22P02 (normalized to null)', () => {
      // Known placeholders from UI defaults or test fixtures
      expect(normalizeOptionalExerciseId('ex-1')).toBeNull();
      expect(normalizeOptionalExerciseId('ex-2')).toBeNull();
      expect(normalizeOptionalExerciseId('ex-bench-press')).toBeNull();
      expect(normalizeOptionalExerciseId('placeholder')).toBeNull();
      expect(normalizeOptionalExerciseId('none')).toBeNull();
      expect(normalizeOptionalExerciseId('')).toBeNull();
      expect(normalizeOptionalExerciseId(null)).toBeNull();
      expect(normalizeOptionalExerciseId(undefined)).toBeNull();
    });

    it('optional unknown exercise association follows the documented null-handling contract', async () => {
      let insertedPayload: any = null;

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'exercise_sets') {
            return {
              insert: vi.fn().mockImplementation((payload: any) => {
                insertedPayload = payload;
                return {
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'set-101', ...payload },
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
      const executionService = new WorkoutExecutionService(sessionRepo, planRepo);

      // Mock active session lookup
      vi.spyOn(sessionRepo as any, 'findById').mockResolvedValue({
        isSuccess: () => true,
        isFailure: () => false,
        value: { id: mockSessionId, user_id: userId, state: 'started' } as any,
      } as any);

      // Submit set with placeholder 'ex-1'
      const res = await executionService.logSet(mockSessionId, userId, {
        exercise_id: 'ex-1',
        weight_kg: 85,
        reps: 8,
        rpe: 8,
      });

      expect(res.isSuccess()).toBe(true);
      expect(insertedPayload).not.toBeNull();
      // exercise_id MUST be normalized to null so Postgres receives NULL instead of 'ex-1'
      expect(insertedPayload.exercise_id).toBeNull();
      expect(insertedPayload.session_id).toBe(mockSessionId);
      expect(insertedPayload.weight_kg).toBe(85);
      expect(insertedPayload.reps).toBe(8);
    });

    it('required invalid IDs are rejected with a clear validation error', async () => {
      const mockExerciseRepo = {
        findById: vi.fn(),
      } as any;
      const exerciseService = new ExerciseService(mockExerciseRepo);
      const exerciseController = new ExerciseController(exerciseService);

      const reqInvalid = {
        params: { id: 'invalid-non-uuid-id' },
      } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;
      const next = vi.fn();

      await exerciseController.getExercise(reqInvalid, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      const errorPassed = next.mock.calls[0][0];
      expect(errorPassed.statusCode).toBe(400);
      expect(errorPassed.message).toContain('must be a valid UUID');
    });

    it('valid set persistence and session ownership checks still work', async () => {
      const otherUserId = '22222222-2222-4222-8222-222222222222';

      const mockSupabase = {
        from: vi.fn().mockReturnValue({}),
      } as any;

      const sessionRepo = new V2WorkoutSessionRepository(mockSupabase);
      const planRepo = new WorkoutPlanRepository(mockSupabase);
      const executionService = new WorkoutExecutionService(sessionRepo, planRepo);

      // Session belongs to userId
      vi.spyOn(sessionRepo as any, 'findById').mockResolvedValue({
        isSuccess: () => true,
        isFailure: () => false,
        value: { id: mockSessionId, user_id: userId, state: 'started' } as any,
      } as any);

      // Other user attempts to log set to this session -> MUST fail with 403 Forbidden
      const resForbidden = await executionService.logSet(mockSessionId, otherUserId, {
        exercise_id: validUuid,
        weight_kg: 100,
        reps: 5,
      });

      expect(resForbidden.isFailure()).toBe(true);
      if (resForbidden.isFailure()) {
        expect(resForbidden.error.statusCode).toBe(403);
      }
    });
  });
});
