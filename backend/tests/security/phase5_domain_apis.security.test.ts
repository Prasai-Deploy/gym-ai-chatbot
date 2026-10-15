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
          if (table === 'profiles') {
            return { data: { id: 'usr-member-a', email: 'member.a@striva.app', full_name: 'Member A' }, error: null };
          }
          if (table === 'v2_fitness_profiles') {
            return { data: { id: 'usr-member-a', level: 'intermediate', height_cm: 180, target_weight_kg: 75 }, error: null };
          }
          if (table === 'user_preferences') {
            return { data: { id: 'usr-member-a', unit_system: 'metric', push_notifications_enabled: true }, error: null };
          }
          if (table === 'member_settings') {
            return { data: { id: 'usr-member-a', theme: 'dark', start_of_week: 1 }, error: null };
          }
          if (table === 'v2_workout_sessions') {
            return { data: { id: 'sess-a-1', user_id: 'usr-member-a', state: 'started', title: 'Chest Day' }, error: null };
          }
          if (table === 'organizations') {
            return { data: { id: 'org-alpha', name: 'Alpha Gym', owner_id: 'usr-owner-1' }, error: null };
          }
          if (table === 'v2_nutrition_logs') {
            return { data: { id: 'nutr-101', user_id: 'usr-member-a', food_name: 'Chicken Breast', calories: 250, protein_g: 45 }, error: null };
          }
          if (table === 'water_logs') {
            return { data: { id: 'wat-101', user_id: 'usr-member-a', amount_ml: 250 }, error: null };
          }
          return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
        }),
        maybeSingle: vi.fn().mockImplementation(async () => {
          if (table === 'subscriptions') {
            return {
              data: {
                id: 'sub-a-1',
                user_id: 'usr-member-a',
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
            return { data: { id: 'sess-a-1', user_id: 'usr-member-a', state: 'started' }, error: null };
          }
          return { data: null, error: null };
        }),
        then: vi.fn().mockImplementation((resolve) => {
          if (table === 'organization_members') {
            return resolve({ data: [{ organization_id: 'org-alpha', role: 'Member', user_id: 'usr-member-a' }], error: null });
          }
          if (table === 'organizations') {
            return resolve({ data: [{ id: 'org-alpha', name: 'Alpha Gym' }], error: null });
          }
          if (table === 'exercises') {
            return resolve({ data: [{ id: 'ex-1', name: 'Bench Press', category: 'Chest' }], error: null });
          }
          if (table === 'workout_plans') {
            return resolve({ data: [{ id: 'plan-1', user_id: 'usr-member-a', title: 'Strength 5x5' }], error: null });
          }
          if (table === 'v2_nutrition_logs') {
            return resolve({ data: [{ id: 'nutr-1', user_id: 'usr-member-a', date: '2026-09-17', food_name: 'Oats', calories: 350 }], error: null });
          }
          if (table === 'water_logs') {
            return resolve({ data: [{ id: 'wat-1', user_id: 'usr-member-a', amount_ml: 500 }], error: null });
          }
          if (table === 'attendance_logs') {
            return resolve({ data: [{ id: 'att-1', user_id: 'usr-member-a', organization_id: 'org-alpha', status: 'completed' }], error: null });
          }
          return resolve({ data: [], error: null });
        }),
      };
    }),
  };
  return {
    supabase: mockDb,
    supabaseAdmin: mockDb,
  };
});

describe('STRIVA V2 — Phase 5 Core Domain APIs Security Suite', () => {

  describe('5A — Identity & Organization APIs Security', () => {
    it('requires JWT authentication for GET /api/v1/identity/profile (401)', async () => {
      const res = await request(app).get('/api/v1/identity/profile');
      expect(res.status).toBe(401);
    });

    it('returns authenticated profile for valid JWT', async () => {
      const res = await request(app)
        .get('/api/v1/identity/profile')
        .set('Authorization', 'Bearer token-member-a');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('usr-member-a');
    });

    it('returns member settings via /api/v1/identity/profile/settings', async () => {
      const res = await request(app)
        .get('/api/v1/identity/profile/settings')
        .set('Authorization', 'Bearer token-member-a');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('requires auth for organization endpoints', async () => {
      const res = await request(app).get('/api/v1/organizations');
      expect(res.status).toBe(401);
    });

    it('lists organizations for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', 'Bearer token-member-a');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('5B — Exercise & Workout APIs Security', () => {
    it('lists exercises with JWT auth', async () => {
      const res = await request(app)
        .get('/api/v1/exercises')
        .set('Authorization', 'Bearer token-member-a');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('gets today workout context for member', async () => {
      const res = await request(app)
        .get('/api/v1/workouts/today')
        .set('Authorization', 'Bearer token-member-a');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('prevents unauthenticated workout session access', async () => {
      const res = await request(app).get('/api/v1/workouts/sessions/sess-a-1');
      expect(res.status).toBe(401);
    });

    it('starts workout session using v2_workout_sessions engine', async () => {
      const res = await request(app)
        .post('/api/v1/workouts/sessions/start')
        .set('Authorization', 'Bearer token-member-a')
        .send({ title: 'Hypertrophy Upper' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('5C — Nutrition & Hydration APIs Security', () => {
    it('requires authentication for nutrition daily summary', async () => {
      const res = await request(app).get('/api/v1/nutrition/daily');
      expect(res.status).toBe(401);
    });

    it('returns daily nutrition summary for authenticated member', async () => {
      const res = await request(app)
        .get('/api/v1/nutrition/daily')
        .set('Authorization', 'Bearer token-member-a');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalCalories).toBeDefined();
    });

    it('creates meal log with Zod validation', async () => {
      const res = await request(app)
        .post('/api/v1/nutrition/meals')
        .set('Authorization', 'Bearer token-member-a')
        .send({ food_name: 'Chicken Breast', calories: 250, protein_g: 45 });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('rejects invalid meal log payload with 400/422 validation error', async () => {
      const res = await request(app)
        .post('/api/v1/nutrition/meals')
        .set('Authorization', 'Bearer token-member-a')
        .send({ food_name: '', calories: -50 });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });

    it('logs water intake for authenticated user', async () => {
      const res = await request(app)
        .post('/api/v1/nutrition/water')
        .set('Authorization', 'Bearer token-member-a')
        .send({ amount_ml: 250 });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('5D — Progress & Attendance APIs Security', () => {
    it('retrieves progress statistics for authenticated member', async () => {
      const res = await request(app)
        .get('/api/v1/progress/statistics')
        .set('Authorization', 'Bearer token-member-a');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('retrieves user achievements for authenticated member', async () => {
      const res = await request(app)
        .get('/api/v1/progress/achievements')
        .set('Authorization', 'Bearer token-member-a');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('retrieves member attendance history', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/attendance/history')
        .set('Authorization', 'Bearer token-member-a');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Demo User Security & Reset Isolation', () => {
    it('allows official demo user to call reset endpoint', async () => {
      const res = await request(app)
        .post('/api/v1/identity/demo/reset')
        .set('Authorization', 'Bearer token-demo');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('denies non-demo user from executing demo reset (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/identity/demo/reset')
        .set('Authorization', 'Bearer token-member-a');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
