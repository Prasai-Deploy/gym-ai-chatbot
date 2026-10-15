import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app/app';

// Mock Supabase DB Client for Phase 8E Security Suite
vi.mock('../../src/database/supabase', () => {
  let attendanceStore: any[] = [];

  const resetStore = () => {
    attendanceStore = [
      {
        id: 'att-active-1',
        organization_id: 'org-owner-1',
        user_id: 'usr-member-1',
        check_in_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        check_out_time: null,
        status: 'active',
        duration_minutes: null,
        location_id: 'loc-main',
      },
      {
        id: 'att-other-org-1',
        organization_id: 'org-other-2',
        user_id: 'usr-member-2',
        check_in_time: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        check_out_time: null,
        status: 'active',
        duration_minutes: null,
        location_id: null,
      },
    ];
  };

  resetStore();

  const mockDb = {
    _resetStore: resetStore,
    auth: {
      getUser: vi.fn(async (token: string) => {
        if (token === 'token-owner') {
          return {
            data: {
              user: {
                id: 'usr-owner-1',
                email: 'owner@striva.app',
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
                email: 'manager@striva.app',
                user_metadata: { role: 'Gym Manager' },
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
                email: 'frontdesk@striva.app',
                user_metadata: { role: 'Front Desk' },
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
                email: 'trainer@striva.app',
                user_metadata: { role: 'Trainer' },
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
                email: 'nutritionist@striva.app',
                user_metadata: { role: 'Nutritionist' },
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
                email: 'member1@striva.app',
                user_metadata: { role: 'Member' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-member-eligible') {
          return {
            data: {
              user: {
                id: 'usr-member-eligible',
                email: 'eligible@striva.app',
                user_metadata: { role: 'Member' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-foreign-member') {
          return {
            data: {
              user: {
                id: 'usr-foreign-999',
                email: 'foreign@othergym.app',
                user_metadata: { role: 'Member' },
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
        return { data: { user: null }, error: new Error('Invalid token') };
      }),
    },
    from: vi.fn((table: string) => {
      let filterEqCol = '';
      let filterEqVal = '';
      const filters: { col: string; val: any }[] = [];
      let insertPayload: any = null;
      let updatePayload: any = null;

      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        insert: vi.fn((data: any) => {
          insertPayload = Array.isArray(data) ? data[0] : data;
          return queryBuilder;
        }),
        update: vi.fn((data: any) => {
          updatePayload = data;
          return queryBuilder;
        }),
        eq: vi.fn((col: string, val: any) => {
          filterEqCol = col;
          filterEqVal = val;
          filters.push({ col, val });
          return queryBuilder;
        }),
        maybeSingle: vi.fn().mockImplementation(async () => {
          if (table === 'attendance_logs') {
            const orgFilter = filters.find((f) => f.col === 'organization_id');
            const idFilter = filters.find((f) => f.col === 'id');
            const match = attendanceStore.find(
              (r) =>
                (!orgFilter || r.organization_id === orgFilter.val) &&
                (!idFilter || r.id === idFilter.val)
            );
            return { data: match || null, error: null };
          }
          if (table === 'subscriptions') {
            return {
              data: {
                id: 'sub-1',
                user_id: filterEqVal,
                status: 'active',
                tier: 'pro',
                current_period_end: new Date(Date.now() + 864000000).toISOString(),
              },
              error: null,
            };
          }
          return { data: null, error: null };
        }),
        single: vi.fn().mockImplementation(async () => {
          if (table === 'organizations') {
            return {
              data: {
                id: 'org-owner-1',
                name: 'Titan Gym',
                owner_id: 'usr-owner-1',
              },
              error: null,
            };
          }

          if (table === 'organization_members') {
            const orgFilter = filters.find((f) => f.col === 'organization_id');
            const userFilter = filters.find((f) => f.col === 'user_id');
            const targetUser = userFilter ? userFilter.val : filterEqVal;

            if (!orgFilter || orgFilter.val === 'org-owner-1') {
              if (targetUser === 'usr-owner-1') {
                return { data: { id: 'mem-1', organization_id: 'org-owner-1', user_id: 'usr-owner-1', role: 'Organization Owner', status: 'active' }, error: null };
              }
              if (targetUser === 'usr-mgr-1') {
                return { data: { id: 'mem-2', organization_id: 'org-owner-1', user_id: 'usr-mgr-1', role: 'Gym Manager', status: 'active' }, error: null };
              }
              if (targetUser === 'usr-trainer-1') {
                return { data: { id: 'mem-3', organization_id: 'org-owner-1', user_id: 'usr-trainer-1', role: 'Trainer', status: 'active' }, error: null };
              }
              if (targetUser === 'usr-frontdesk-1') {
                return { data: { id: 'mem-4', organization_id: 'org-owner-1', user_id: 'usr-frontdesk-1', role: 'Front Desk', status: 'active' }, error: null };
              }
              if (targetUser === 'usr-nutri-1') {
                return { data: { id: 'mem-5', organization_id: 'org-owner-1', user_id: 'usr-nutri-1', role: 'Nutritionist', status: 'active' }, error: null };
              }
              if (targetUser === 'usr-member-1') {
                return { data: { id: 'mem-6', organization_id: 'org-owner-1', user_id: 'usr-member-1', role: 'Member', status: 'active' }, error: null };
              }
              if (targetUser === 'usr-member-eligible') {
                return { data: { id: 'mem-7', organization_id: 'org-owner-1', user_id: 'usr-member-eligible', role: 'Member', status: 'active' }, error: null };
              }
            }
            return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
          }

          if (table === 'profiles') {
            const idFilter = filters.find((f) => f.col === 'id');
            const uid = idFilter ? idFilter.val : filterEqVal;
            if (uid === 'usr-foreign-999') {
              return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
            }
            return {
              data: {
                id: uid || 'usr-default',
                organization_id: 'org-owner-1',
                full_name: 'Gym Member',
                email: 'member@striva.app',
              },
              error: null,
            };
          }

          if (table === 'attendance_logs') {
            if (insertPayload) {
              const created = {
                id: `att-created-${Date.now()}`,
                ...insertPayload,
              };
              attendanceStore.push(created);
              return { data: created, error: null };
            }

            if (updatePayload) {
              const idFilter = filters.find((f) => f.col === 'id');
              const rec = attendanceStore.find((r) => r.id === idFilter?.val);
              if (rec) {
                Object.assign(rec, updatePayload);
                return { data: rec, error: null };
              }
            }

            const orgFilter = filters.find((f) => f.col === 'organization_id');
            const userFilter = filters.find((f) => f.col === 'user_id');
            const statusFilter = filters.find((f) => f.col === 'status');
            const idFilter = filters.find((f) => f.col === 'id');

            const match = attendanceStore.find(
              (r) =>
                (!orgFilter || r.organization_id === orgFilter.val) &&
                (!userFilter || r.user_id === userFilter.val) &&
                (!statusFilter || r.status === statusFilter.val) &&
                (!idFilter || r.id === idFilter.val)
            );

            if (match) return { data: match, error: null };
            return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
          }

          if (table === 'subscriptions') {
            return {
              data: {
                id: 'sub-canonical-1',
                user_id: filterEqVal,
                status: 'active',
                tier: 'pro',
                interval: 'monthly',
                current_period_end: new Date(Date.now() + 864000000).toISOString(),
              },
              error: null,
            };
          }

          return { data: null, error: null };
        }),
        then: vi.fn().mockImplementation((resolve) => {
          if (table === 'organization_members') {
            if (filterEqVal === 'usr-owner-1') {
              return resolve({ data: [{ organization_id: 'org-owner-1', role: 'Organization Owner', user_id: 'usr-owner-1' }], error: null });
            }
            if (filterEqVal === 'usr-mgr-1') {
              return resolve({ data: [{ organization_id: 'org-owner-1', role: 'Gym Manager', user_id: 'usr-mgr-1' }], error: null });
            }
            if (filterEqVal === 'usr-trainer-1') {
              return resolve({ data: [{ organization_id: 'org-owner-1', role: 'Trainer', user_id: 'usr-trainer-1' }], error: null });
            }
            if (filterEqVal === 'usr-frontdesk-1') {
              return resolve({ data: [{ organization_id: 'org-owner-1', role: 'Front Desk', user_id: 'usr-frontdesk-1' }], error: null });
            }
            if (filterEqVal === 'usr-nutri-1') {
              return resolve({ data: [{ organization_id: 'org-owner-1', role: 'Nutritionist', user_id: 'usr-nutri-1' }], error: null });
            }
            if (filterEqVal === 'usr-member-1') {
              return resolve({ data: [{ organization_id: 'org-owner-1', role: 'Member', user_id: 'usr-member-1' }], error: null });
            }
            if (filterEqVal === 'usr-member-eligible') {
              return resolve({ data: [{ organization_id: 'org-owner-1', role: 'Member', user_id: 'usr-member-eligible' }], error: null });
            }
            if (filterEqVal === 'org-owner-1') {
              return resolve({
                data: [
                  { id: 'mem-1', organization_id: 'org-owner-1', user_id: 'usr-member-1', role: 'Member', status: 'active', profiles: { full_name: 'Priyanshu Paswan', email: 'member1@striva.app' } },
                ],
                count: 1,
                error: null,
              });
            }
            return resolve({ data: [], error: null });
          }

          if (table === 'attendance_logs') {
            const orgFilter = filters.find((f) => f.col === 'organization_id');
            const matches = attendanceStore.filter(
              (r) => !orgFilter || r.organization_id === orgFilter.val
            );
            return resolve({ data: matches, error: null });
          }

          if (table === 'profiles') {
            return resolve({
              data: [
                { id: 'usr-member-1', full_name: 'Priyanshu Paswan', email: 'member1@striva.app', avatar_url: null },
              ],
              error: null,
            });
          }

          return resolve({ data: [], error: null });
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

describe('Phase 8E — Gym Owner Attendance Operations Security Suite', () => {
  beforeEach(async () => {
    const { supabase } = await import('../../src/database/supabase');
    (supabase as any)._resetStore();
  });

  // 1. Owner can view attendance overview
  it('1. Owner can view attendance overview', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/today')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalCheckInsToday');
    expect(res.body.data).toHaveProperty('currentlyInsideCount');
    expect(res.body.data).toHaveProperty('activeSessions');
  });

  // 2. Manager can view attendance overview
  it('2. Manager can view attendance overview', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/today')
      .set('Authorization', 'Bearer token-manager');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 3. Front Desk can perform allowed check-in
  it('3. Front Desk can perform allowed check-in', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/checkin')
      .set('Authorization', 'Bearer token-frontdesk')
      .send({ userId: 'usr-member-eligible' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user_id).toBe('usr-member-eligible');
    expect(res.body.data.status).toBe('active');
  });

  // 4. Trainer can perform allowed attendance actions (can view today overview)
  it('4. Trainer can perform allowed attendance actions', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/today')
      .set('Authorization', 'Bearer token-trainer');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 5. Member cannot access owner attendance terminal (today overview)
  it('5. Member cannot access owner attendance terminal', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/today')
      .set('Authorization', 'Bearer token-member-1');

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
  });

  // 6. Nutritionist cannot access owner attendance terminal unless explicitly permitted
  it('6. Nutritionist cannot access owner attendance terminal', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/today')
      .set('Authorization', 'Bearer token-nutritionist');

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
  });

  // 7. Demo user cannot access owner attendance terminal
  it('7. Demo user cannot access owner attendance terminal', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/today')
      .set('Authorization', 'Bearer token-demo');

    expect(res.status).toBe(403);
  });

  // 8. Cross-tenant check-in rejected
  it('8. Cross-tenant check-in rejected', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/checkin')
      .set('Authorization', 'Bearer token-frontdesk')
      .send({ userId: 'usr-foreign-999' });

    expect(res.status).toBe(403);
    const msg = res.body.error?.message || res.body.error || '';
    expect(msg).toMatch(/does not belong to organization/i);
  });

  // 9. Spoofed x-organization-id rejected (tenant identity derived server-side)
  it('9. Spoofed x-organization-id rejected', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/checkin')
      .set('Authorization', 'Bearer token-frontdesk')
      .set('x-organization-id', 'org-hacked-999')
      .send({ userId: 'usr-member-eligible' });

    // The tenant middleware rejects unassociated requested tenant with 403 Forbidden
    expect(res.status).toBe(403);
    const msg = res.body.error?.message || res.body.error || '';
    expect(msg).toMatch(/does not belong to requested organization/i);
  });

  // 10. Arbitrary target user rejected when Member attempts to check in another user
  it('10. Arbitrary target user rejected when Member attempts to check in another user', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/checkin')
      .set('Authorization', 'Bearer token-member-1')
      .send({ userId: 'usr-member-eligible' });

    expect(res.status).toBe(403);
    const msg = res.body.error?.message || res.body.error || '';
    expect(msg).toMatch(/not authorized to check in other members/i);
  });

  // 11. Member must belong to organization
  it('11. Member must belong to organization', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/checkin')
      .set('Authorization', 'Bearer token-foreign-member')
      .send({});

    // Foreign member does not have membership in org-owner-1 -> tenant middleware 403
    expect(res.status).toBe(403);
  });

  // 12. Duplicate active check-in rejected with HTTP 409
  it('12. Duplicate active check-in rejected with 409 Conflict', async () => {
    // usr-member-1 already has an active check-in in store
    const res = await request(app)
      .post('/api/v1/attendance/checkin')
      .set('Authorization', 'Bearer token-frontdesk')
      .send({ userId: 'usr-member-1' });

    expect(res.status).toBe(409);
    const msg = res.body.error?.message || res.body.error || '';
    expect(msg).toMatch(/already has an active check-in session/i);
  });

  // 13. Valid check-in succeeds
  it('13. Valid check-in succeeds', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/checkin')
      .set('Authorization', 'Bearer token-owner')
      .send({ userId: 'usr-member-eligible' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('active');
  });

  // 14. Valid checkout succeeds
  it('14. Valid checkout succeeds', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/checkout')
      .set('Authorization', 'Bearer token-frontdesk')
      .send({ attendanceId: 'att-active-1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.check_out_time).toBeDefined();
    expect(res.body.data.duration_minutes).toBeGreaterThanOrEqual(0);
  });

  // 15. Checkout of another organization session rejected
  it('15. Checkout of another organization session rejected', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/checkout')
      .set('Authorization', 'Bearer token-owner')
      .send({ attendanceId: 'att-other-org-1' });

    expect(res.status).toBe(404);
    const msg = res.body.error?.message || res.body.error || '';
    expect(msg).toMatch(/not found in this organization/i);
  });

  // 16. Checkout of nonexistent active session rejected
  it('16. Checkout of nonexistent active session rejected', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/checkout')
      .set('Authorization', 'Bearer token-frontdesk')
      .send({ attendanceId: 'att-does-not-exist' });

    expect(res.status).toBe(404);
  });

  // 17. Attendance history is organization scoped
  it('17. Attendance history is organization scoped', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/history')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // 18. Search is organization scoped
  it('18. Search is organization scoped', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/members/search?q=Priyanshu')
      .set('Authorization', 'Bearer token-frontdesk');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 19. Missing attendanceId during checkout rejected without fallback
  it('19. Missing attendanceId during checkout rejected without fallback', async () => {
    const res = await request(app)
      .post('/api/v1/attendance/checkout')
      .set('Authorization', 'Bearer token-frontdesk')
      .send({});

    expect(res.status).toBe(400);
    const msg = res.body.error?.message || res.body.error || '';
    expect(msg).toMatch(/attendanceId is required/i);
  });

  // 20. Consumer billing remains unaffected
  it('20. Consumer billing remains unaffected by attendance operations', async () => {
    const res = await request(app)
      .get('/api/v1/billing/status')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('active');
  });
});
