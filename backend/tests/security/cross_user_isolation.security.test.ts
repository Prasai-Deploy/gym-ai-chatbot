import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app/app';

// Mock Supabase DB and Auth Calls
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
      let filterId: string | null = null;

      const builder: any = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn((col: string, val: any) => {
          if (col === 'user_id' || col === 'id') {
            if (col === 'user_id') filterUserId = val;
            if (col === 'id') filterId = val;
          }
          return builder;
        }),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(async () => {
          if (table === 'v2_workout_sessions') {
            // sess-a-1 belongs to usr-member-a
            if (filterId === 'sess-a-1' || !filterId) {
              if (filterUserId && filterUserId !== 'usr-member-a') {
                return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
              }
              return { data: { id: 'sess-a-1', user_id: 'usr-member-a', state: 'started', title: 'Chest Day' }, error: null };
            }
          }
          if (table === 'exercise_sets') {
            if (filterId === 'set-a-1') {
              return { data: { id: 'set-a-1', session_id: 'sess-a-1', set_number: 1 }, error: null };
            }
          }
          if (table === 'workout_plans') {
            if (filterId === 'plan-a-1') {
              if (filterUserId && filterUserId !== 'usr-member-a') {
                return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
              }
              return { data: { id: 'plan-a-1', user_id: 'usr-member-a', title: 'Plan A' }, error: null };
            }
          }
          if (table === 'v2_nutrition_logs') {
            if (filterId === 'nutr-a-1') {
              if (filterUserId && filterUserId !== 'usr-member-a') {
                return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
              }
              return { data: { id: 'nutr-a-1', user_id: 'usr-member-a', food_name: 'Chicken', calories: 200 }, error: null };
            }
          }
          return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
        }),
        maybeSingle: vi.fn().mockImplementation(async () => {
          if (table === 'subscriptions') {
            // Both members have active pro subscriptions
            return {
              data: {
                id: 'sub-active',
                user_id: filterUserId || 'usr-member-a',
                tier: 'pro',
                interval: 'monthly',
                status: 'active',
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
                cancel_at_period_end: false,
              },
              error: null,
            };
          }
          if (table === 'v2_workout_sessions') {
            if (filterId === 'sess-a-1' || !filterId) {
              if (filterUserId && filterUserId !== 'usr-member-a') {
                return { data: null, error: null };
              }
              return { data: { id: 'sess-a-1', user_id: 'usr-member-a', state: 'started', title: 'Chest Day' }, error: null };
            }
          }
          if (table === 'exercise_sets') {
            if (filterId === 'set-a-1') {
              return { data: { id: 'set-a-1', session_id: 'sess-a-1', set_number: 1 }, error: null };
            }
          }
          return { data: null, error: null };
        }),
        then: vi.fn().mockImplementation((resolve) => {
          if (table === 'organization_members') {
            // usr-member-a is member of org-alpha ONLY
            return resolve({ data: [{ organization_id: 'org-alpha', role: 'Member', user_id: 'usr-member-a' }], error: null });
          }
          if (table === 'organizations') {
            return resolve({ data: [{ id: 'org-alpha', name: 'Alpha Gym' }], error: null });
          }
          return resolve({ data: [], error: null });
        }),
      };

      return builder;
    }),
  };

  return {
    supabase: mockDb,
    supabaseAdmin: mockDb,
  };
});

describe('STRIVA V2 — Cross-User & Tenant Data Isolation Security', () => {
  describe('Workout Session Cross-User Security', () => {
    it('prevents Member B from viewing Member A workout session (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/workouts/sessions/sess-a-1')
        .set('Authorization', 'Bearer token-member-b');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      const errMsg = res.body.error?.message || res.body.message;
      expect(errMsg).toContain('Access denied');
    });

    it('allows Member A to view their own workout session (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/workouts/sessions/sess-a-1')
        .set('Authorization', 'Bearer token-member-a');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('sess-a-1');
    });

    it('prevents Member B from transitioning Member A session state (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/workouts/sessions/sess-a-1/transition')
        .set('Authorization', 'Bearer token-member-b')
        .send({ state: 'paused' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('prevents Member B from completing Member A session (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/workouts/sessions/sess-a-1/complete')
        .set('Authorization', 'Bearer token-member-b')
        .send({ notes: 'Malicious completion attempt' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('prevents Member B from logging sets into Member A session (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/workouts/sets')
        .set('Authorization', 'Bearer token-member-b')
        .send({ sessionId: 'sess-a-1', reps: 10, weight_kg: 100 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('prevents Member B from completing Member A exercise set (403 Forbidden)', async () => {
      const res = await request(app)
        .patch('/api/v1/workouts/sets/set-a-1')
        .set('Authorization', 'Bearer token-member-b')
        .send({ reps: 8, weight_kg: 80 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Workout Plan Cross-User Isolation', () => {
    it('prevents Member B from updating Member A workout plan (404/403 Scoped)', async () => {
      const res = await request(app)
        .patch('/api/v1/workouts/plans/plan-a-1')
        .set('Authorization', 'Bearer token-member-b')
        .send({ title: 'Hacked Title' });

      // Plan repository filters by user_id, failing to find another member's record
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Nutrition Log Cross-User Isolation', () => {
    it('prevents Member B from updating Member A meal log (404 Scoped)', async () => {
      const res = await request(app)
        .patch('/api/v1/nutrition/meals/nutr-a-1')
        .set('Authorization', 'Bearer token-member-b')
        .send({ food_name: 'Altered Food' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Demo Account Security Boundary', () => {
    it('forbids normal members from calling demo reset endpoint (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/identity/demo/reset')
        .set('Authorization', 'Bearer token-member-a');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      const errMsg = res.body.error?.message || res.body.message;
      expect(errMsg).toContain('Only demo users can reset data');
    });
  });

  describe('Tenant-Level Organization Isolation', () => {
    it('rejects access when Member A requests foreign tenant org header (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/organizations/current')
        .set('Authorization', 'Bearer token-member-a')
        .set('x-organization-id', 'org-unauthorized-external-999');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      const errMsg = res.body.error?.message || res.body.message;
      expect(errMsg).toContain('User does not belong to requested organization');
    });
  });
});
