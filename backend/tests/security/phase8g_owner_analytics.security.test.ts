import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app/app';

// Mock database store for Phase 8G Owner Analytics Suite
vi.mock('../../src/database/supabase', () => {
  let mockStore = {
    organizations: [] as any[],
    organization_members: [] as any[],
    attendance_logs: [] as any[],
    trainer_member_assignments: [] as any[],
    profiles: [] as any[],
    subscriptions: [] as any[],
  };

  const resetStore = () => {
    mockStore = {
      organizations: [
        { id: 'org-owner-1', name: 'Titan Gym Central', owner_id: 'usr-owner-1' },
        { id: 'org-other-2', name: 'Rival Fitness', owner_id: 'usr-rival-owner' },
        { id: 'org-empty-3', name: 'Brand New Gym', owner_id: 'usr-owner-1' },
      ],
      organization_members: [
        // Org 1: Staff & Members
        { id: 'mem-1', organization_id: 'org-owner-1', user_id: 'usr-owner-1', role: 'Organization Owner', status: 'active', created_at: '2026-06-01T00:00:00Z' },
        { id: 'mem-2', organization_id: 'org-owner-1', user_id: 'usr-mgr-1', role: 'Gym Manager', status: 'active', created_at: '2026-06-01T00:00:00Z' },
        { id: 'mem-3', organization_id: 'org-owner-1', user_id: 'usr-trainer-1', role: 'Trainer', status: 'active', created_at: '2026-06-01T00:00:00Z' },
        { id: 'mem-4', organization_id: 'org-owner-1', user_id: 'usr-trainer-2', role: 'Trainer', status: 'active', created_at: '2026-06-01T00:00:00Z' },
        { id: 'mem-5', organization_id: 'org-owner-1', user_id: 'usr-frontdesk-1', role: 'Front Desk', status: 'active', created_at: '2026-06-01T00:00:00Z' },
        { id: 'mem-6', organization_id: 'org-owner-1', user_id: 'usr-nutri-1', role: 'Nutritionist', status: 'active', created_at: '2026-06-01T00:00:00Z' },
        { id: 'mem-7', organization_id: 'org-owner-1', user_id: 'usr-member-1', role: 'Member', status: 'active', created_at: '2026-10-02T00:00:00Z' },
        { id: 'mem-8', organization_id: 'org-owner-1', user_id: 'usr-member-2', role: 'Member', status: 'active', created_at: '2026-10-05T00:00:00Z' },
        { id: 'mem-9', organization_id: 'org-owner-1', user_id: 'usr-member-3', role: 'Member', status: 'inactive', created_at: '2026-07-01T00:00:00Z' },

        // Org 1: owner also in empty org 3
        { id: 'mem-empty-1', organization_id: 'org-empty-3', user_id: 'usr-owner-1', role: 'Organization Owner', status: 'active', created_at: '2026-10-01T00:00:00Z' },

        // Org 2: Other Org Members
        { id: 'mem-10', organization_id: 'org-other-2', user_id: 'usr-rival-owner', role: 'Organization Owner', status: 'active', created_at: '2026-06-01T00:00:00Z' },
        { id: 'mem-11', organization_id: 'org-other-2', user_id: 'usr-rival-member', role: 'Member', status: 'active', created_at: '2026-10-03T00:00:00Z' },
      ],
      attendance_logs: [
        // Current window logs for Org 1 (Oct 2026)
        { id: 'att-1', organization_id: 'org-owner-1', user_id: 'usr-member-1', check_in_time: '2026-10-02T07:15:00Z', duration_minutes: 60, status: 'completed' },
        { id: 'att-2', organization_id: 'org-owner-1', user_id: 'usr-member-1', check_in_time: '2026-10-03T07:45:00Z', duration_minutes: 45, status: 'completed' },
        { id: 'att-3', organization_id: 'org-owner-1', user_id: 'usr-member-2', check_in_time: '2026-10-04T18:00:00Z', duration_minutes: 75, status: 'completed' },

        // Prior window logs for Org 1 (Sept 2026)
        { id: 'att-prev-1', organization_id: 'org-owner-1', user_id: 'usr-member-1', check_in_time: '2026-09-10T08:00:00Z', duration_minutes: 50, status: 'completed' },
        { id: 'att-prev-2', organization_id: 'org-owner-1', user_id: 'usr-member-3', check_in_time: '2026-09-15T09:00:00Z', duration_minutes: 50, status: 'completed' },

        // Org 2 attendance
        { id: 'att-other-1', organization_id: 'org-other-2', user_id: 'usr-rival-member', check_in_time: '2026-10-02T12:00:00Z', duration_minutes: 90, status: 'completed' },
      ],
      trainer_member_assignments: [
        { id: 'asg-1', organization_id: 'org-owner-1', trainer_user_id: 'usr-trainer-1', member_user_id: 'usr-member-1', status: 'active', assigned_at: '2026-09-16T00:00:00Z' },
        { id: 'asg-2', organization_id: 'org-owner-1', trainer_user_id: 'usr-trainer-1', member_user_id: 'usr-member-2', status: 'active', assigned_at: '2026-09-21T00:00:00Z' },
        { id: 'asg-other', organization_id: 'org-other-2', trainer_user_id: 'usr-trainer-other', member_user_id: 'usr-rival-member', status: 'active', assigned_at: '2026-09-20T00:00:00Z' },
      ],
      profiles: [
        { id: 'usr-owner-1', full_name: 'Titan Owner', email: 'owner@titan.app', avatar_url: null },
        { id: 'usr-mgr-1', full_name: 'Titan Manager', email: 'manager@titan.app', avatar_url: null },
        { id: 'usr-trainer-1', full_name: 'Alex Coach', email: 'alex@titan.app', avatar_url: null },
        { id: 'usr-trainer-2', full_name: 'Sara Coach', email: 'sara@titan.app', avatar_url: null },
        { id: 'usr-member-1', full_name: 'John Doe', email: 'john@user.app', avatar_url: null },
        { id: 'usr-member-2', full_name: 'Jane Smith', email: 'jane@user.app', avatar_url: null },
        { id: 'usr-member-3', full_name: 'Inactive Bob', email: 'bob@user.app', avatar_url: null },
      ],
      subscriptions: [
        { user_id: 'usr-member-1', tier: 'pro', status: 'active' },
        { user_id: 'usr-member-2', tier: 'elite', status: 'active' },
        { user_id: 'usr-member-3', tier: 'free', status: 'canceled' },
      ],
    };
  };

  resetStore();

  let shouldFailQueries = false;

  const mockDb = {
    _resetStore: resetStore,
    _setFailQueries: (val: boolean) => {
      shouldFailQueries = val;
    },
    auth: {
      getUser: vi.fn(async (token: string) => {
        if (token === 'token-owner') {
          return {
            data: {
              user: {
                id: 'usr-owner-1',
                email: 'owner@titan.app',
                user_metadata: { role: 'Organization Owner' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-manager') {
          return {
            data: {
              user: {
                id: 'usr-mgr-1',
                email: 'manager@titan.app',
                user_metadata: { role: 'Gym Manager' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-member-1') {
          return {
            data: {
              user: {
                id: 'usr-member-1',
                email: 'john@user.app',
                user_metadata: { role: 'Member' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-trainer') {
          return {
            data: {
              user: {
                id: 'usr-trainer-1',
                email: 'alex@titan.app',
                user_metadata: { role: 'Trainer' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-frontdesk') {
          return {
            data: {
              user: {
                id: 'usr-frontdesk-1',
                email: 'frontdesk@titan.app',
                user_metadata: { role: 'Front Desk' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-nutritionist') {
          return {
            data: {
              user: {
                id: 'usr-nutri-1',
                email: 'nutri@titan.app',
                user_metadata: { role: 'Nutritionist' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-demo') {
          return {
            data: {
              user: {
                id: 'usr-demo-1',
                email: 'demo@sweatfix.com',
                user_metadata: { role: 'Demo User' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-rival-owner') {
          return {
            data: {
              user: {
                id: 'usr-rival-owner',
                email: 'rival@owner.app',
                user_metadata: { role: 'Organization Owner' },
              },
            },
            error: null,
          };
        }
        return { data: { user: null }, error: new Error('Invalid token') };
      }),
    },
    from: vi.fn((table: string) => {
      if (shouldFailQueries) {
        throw new Error('Database connection failed');
      }

      const filters: { type: string; col: string; val: any }[] = [];

      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        eq: vi.fn((col: string, val: any) => {
          filters.push({ type: 'eq', col, val });
          return queryBuilder;
        }),
        in: vi.fn((col: string, vals: any[]) => {
          filters.push({ type: 'in', col, val: vals });
          return queryBuilder;
        }),
        gte: vi.fn((col: string, val: any) => {
          filters.push({ type: 'gte', col, val });
          return queryBuilder;
        }),
        lte: vi.fn((col: string, val: any) => {
          filters.push({ type: 'lte', col, val });
          return queryBuilder;
        }),
        single: vi.fn(async () => {
          const list = (mockStore as any)[table] || [];
          const match = list.find((item: any) =>
            filters.every((f) => {
              if (f.type === 'eq') return item[f.col] === f.val;
              return true;
            })
          );
          return { data: match || null, error: match ? null : { message: 'Not found' } };
        }),
        maybeSingle: vi.fn(async () => {
          const list = (mockStore as any)[table] || [];
          const match = list.find((item: any) =>
            filters.every((f) => {
              if (f.type === 'eq') return item[f.col] === f.val;
              return true;
            })
          );
          return { data: match || null, error: null };
        }),
        then: vi.fn((resolve: any) => {
          const list = (mockStore as any)[table] || [];
          const matches = list.filter((item: any) =>
            filters.every((f) => {
              if (f.type === 'eq') return item[f.col] === f.val;
              if (f.type === 'in') return f.val.includes(item[f.col]);
              if (f.type === 'gte') return item[f.col] >= f.val;
              if (f.type === 'lte') return item[f.col] <= f.val;
              return true;
            })
          );
          return resolve({ data: matches, count: matches.length, error: null });
        }),
      };

      return queryBuilder;
    }),
  };

  return {
    supabase: mockDb,
    supabaseAdmin: mockDb,
  };
});

describe('Phase 8G: Gym Owner Analytics Security & Multi-Tenancy Suite', () => {
  beforeEach(async () => {
    const { supabase } = await import('../../src/database/supabase');
    (supabase as any)._resetStore();
    (supabase as any)._setFailQueries(false);
  });

  // 1. Owner can access own analytics
  it('1. Owner can access own analytics (200 OK)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview?window=30d')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.organizationId).toBe('org-owner-1');
    expect(res.body.data.members).toBeDefined();
    expect(res.body.data.attendance).toBeDefined();
    expect(res.body.data.trainers).toBeDefined();
    expect(res.body.data.retention).toBeDefined();
  });

  // 2. Manager can access own analytics
  it('2. Manager can access own analytics (200 OK)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview?window=30d')
      .set('Authorization', 'Bearer token-manager');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.organizationId).toBe('org-owner-1');
  });

  // 3. Member cannot access Owner analytics
  it('3. Member cannot access Owner analytics (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', 'Bearer token-member-1');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 4. Trainer cannot access Owner analytics
  it('4. Trainer cannot access Owner analytics (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', 'Bearer token-trainer');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 5. Front Desk cannot access Owner analytics
  it('5. Front Desk cannot access Owner analytics (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', 'Bearer token-frontdesk');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 6. Nutritionist cannot access Owner analytics
  it('6. Nutritionist cannot access Owner analytics (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', 'Bearer token-nutritionist');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 7. Demo cannot access Owner analytics
  it('7. Demo cannot access Owner analytics (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', 'Bearer token-demo');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 8. Organization A cannot access Organization B analytics
  it('8. Organization A cannot access Organization B analytics (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', 'Bearer token-owner')
      .set('x-organization-id', 'org-other-2'); // Requesting Org B while user does not belong to Org B

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 9. x-organization-id spoofing rejected
  it('9. x-organization-id spoofing rejected (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', 'Bearer token-owner')
      .set('x-organization-id', '00000000-0000-0000-0000-000000000001');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 10. Analytics queries are organization scoped
  it('10. Analytics queries are strictly organization scoped (no cross-tenant leakage)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview?from=2026-10-01&to=2026-10-31')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    // Org 1 has 3 members (usr-member-1, usr-member-2, usr-member-3). Org 2 member should NOT be counted.
    expect(res.body.data.members.totalMembers).toBe(3);
    // Org 1 has 3 attendance logs in period. Org 2 has 1 log. Total visits must be exactly 3.
    expect(res.body.data.attendance.totalVisits).toBe(3);
    // Org 1 has 2 trainers (Alex, Sara). Org 2 has 1 trainer.
    expect(res.body.data.trainers.totalTrainers).toBe(2);
  });

  // 11. Global platform counts are not exposed
  it('11. Global platform counts are not exposed (counts reflect tenant data only)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/members')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.data.totalMembers).toBe(3); // Exactly org 1 member count
  });

  // 12. Global revenue is not exposed in Owner analytics
  it('12. Global revenue is not exposed in Owner analytics (financials deferred notice)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.data.financials.status).toBe('deferred_phase_8h');
    expect(res.body.data.financials.note).toContain('deferred to Phase 8H');
    expect(res.body.data.mrr).toBeUndefined();
    expect(res.body.data.arr).toBeUndefined();
  });

  // 13. Legacy USD revenue cannot leak into Owner analytics
  it('13. Legacy USD revenue cannot leak into Owner analytics', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    const jsonStr = JSON.stringify(res.body.data);
    expect(jsonStr).not.toContain('$48,250');
    expect(jsonStr).not.toContain('USD');
  });

  // 14. Empty organization returns honest empty state
  it('14. Empty organization returns honest empty state (no fabricated numbers)', async () => {
    // Switch owner membership context to brand new empty org
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', 'Bearer token-owner')
      .set('x-organization-id', 'org-empty-3');

    expect(res.status).toBe(200);
    expect(res.body.data.members.totalMembers).toBe(0);
    expect(res.body.data.members.hasData).toBe(false);
    expect(res.body.data.attendance.totalVisits).toBe(0);
    expect(res.body.data.attendance.hasData).toBe(false);
    expect(res.body.data.attendance.peakHour).toBe('N/A');
    expect(res.body.data.trainers.totalTrainers).toBe(0);
    expect(res.body.data.retention.retentionRate).toBeNull();
    expect(res.body.data.retention.status).toBe('insufficient_history');
  });

  // 15. Analytics time windows are bounded
  it('15. Analytics time windows are bounded (bounds clamped, invalid date format rejected)', async () => {
    // 1. Invalid date format rejected
    const badRes = await request(app)
      .get('/api/v1/analytics/overview?from=not-a-date&to=invalid')
      .set('Authorization', 'Bearer token-owner');
    expect(badRes.status).toBe(400);

    // 2. Inverted dates rejected
    const invertedRes = await request(app)
      .get('/api/v1/analytics/overview?from=2026-10-10&to=2026-01-01')
      .set('Authorization', 'Bearer token-owner');
    expect(invertedRes.status).toBe(400);

    // 3. Unbounded range (> 90 days) clamped to 90 days
    const clampedRes = await request(app)
      .get('/api/v1/analytics/overview?from=2025-01-01&to=2026-01-01')
      .set('Authorization', 'Bearer token-owner');
    expect(clampedRes.status).toBe(200);
    expect(clampedRes.body.data.period.days).toBeLessThanOrEqual(90);
  });

  // 16. Previous-period comparisons are deterministic
  it('16. Previous-period comparisons are mathematically accurate and deterministic', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview?from=2026-10-01&to=2026-10-31')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    // In Oct 2026: 3 visits. In Sept 2026 (prior window): 2 visits.
    // Change = 3 - 2 = 1. ChangePct = (1 / 2) * 100 = 50.0%
    const comp = res.body.data.attendance.visitsComparison;
    expect(comp.current).toBe(3);
    expect(comp.previous).toBe(2);
    expect(comp.change).toBe(1);
    expect(comp.changePct).toBe(50);
    expect(comp.status).toBe('calculated');
  });

  // 17. Network failure / error never produces fake analytics
  it('17. Database/query exception never produces fake analytics (propagates clean error)', async () => {
    const { supabase } = await import('../../src/database/supabase');
    // Force database failure
    (supabase as any)._setFailQueries(true);

    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });

  // 18. Consumer billing remains unaffected
  it('18. Consumer billing routes remain accessible and unaffected by analytics', async () => {
    const res = await request(app)
      .get('/api/v1/billing/status')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
  });

  // 19. Member dashboard remains unaffected
  it('19. Member dashboard/attendance history remains unaffected', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/attendance/history')
      .set('Authorization', 'Bearer token-member-1');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // 20. Attendance operations remain unaffected
  it('20. Attendance operations remain unaffected', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/today')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
  });

  // 21. Trainer management remains unaffected
  it('21. Trainer management remains unaffected', async () => {
    const res = await request(app)
      .get('/api/v1/trainers')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
  });
});
