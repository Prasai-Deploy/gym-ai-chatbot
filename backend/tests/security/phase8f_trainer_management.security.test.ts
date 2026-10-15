import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app/app';

// Mock Supabase DB Client for Phase 8F Security Suite
vi.mock('../../src/database/supabase', () => {
  let assignmentsStore: any[] = [];

  const resetStore = () => {
    assignmentsStore = [
      {
        id: 'asg-active-1',
        organization_id: 'org-owner-1',
        trainer_user_id: 'usr-trainer-1',
        member_user_id: 'usr-member-1',
        status: 'active',
        assigned_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: 'asg-other-org-1',
        organization_id: 'org-other-2',
        trainer_user_id: 'usr-trainer-other',
        member_user_id: 'usr-member-other',
        status: 'active',
        assigned_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
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
        if (token === 'token-trainer-1') {
          return {
            data: {
              user: {
                id: 'usr-trainer-1',
                email: 'trainer1@striva.app',
                user_metadata: { role: 'Trainer' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-trainer-2') {
          return {
            data: {
              user: {
                id: 'usr-trainer-2',
                email: 'trainer2@striva.app',
                user_metadata: { role: 'Trainer' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-trainer-other') {
          return {
            data: {
              user: {
                id: 'usr-trainer-other',
                email: 'other_trainer@rival.app',
                user_metadata: { role: 'Trainer' },
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
        if (token === 'token-member-2') {
          return {
            data: {
              user: {
                id: 'usr-member-2',
                email: 'member2@striva.app',
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
          if (table === 'trainer_member_assignments') {
            const orgFilter = filters.find((f) => f.col === 'organization_id');
            const trainerFilter = filters.find((f) => f.col === 'trainer_user_id');
            const memberFilter = filters.find((f) => f.col === 'member_user_id');
            const idFilter = filters.find((f) => f.col === 'id');
            const statusFilter = filters.find((f) => f.col === 'status');

            const match = assignmentsStore.find(
              (r) =>
                (!orgFilter || r.organization_id === orgFilter.val) &&
                (!trainerFilter || r.trainer_user_id === trainerFilter.val) &&
                (!memberFilter || r.member_user_id === memberFilter.val) &&
                (!idFilter || r.id === idFilter.val) &&
                (!statusFilter || r.status === statusFilter.val)
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
            const roleFilter = filters.find((f) => f.col === 'role');
            const targetUser = userFilter ? userFilter.val : filterEqVal;

            if (orgFilter?.val === 'org-owner-1' || !orgFilter) {
              if (targetUser === 'usr-owner-1' && (!roleFilter || roleFilter.val === 'Organization Owner')) {
                return { data: { id: 'mem-1', organization_id: 'org-owner-1', user_id: 'usr-owner-1', role: 'Organization Owner', status: 'active' }, error: null };
              }
              if (targetUser === 'usr-mgr-1' && (!roleFilter || roleFilter.val === 'Gym Manager')) {
                return { data: { id: 'mem-2', organization_id: 'org-owner-1', user_id: 'usr-mgr-1', role: 'Gym Manager', status: 'active' }, error: null };
              }
              if (targetUser === 'usr-trainer-1' && (!roleFilter || roleFilter.val === 'Trainer')) {
                return { data: { id: 'mem-3', organization_id: 'org-owner-1', user_id: 'usr-trainer-1', role: 'Trainer', status: 'active', created_at: '2026-01-01T00:00:00Z' }, error: null };
              }
              if (targetUser === 'usr-trainer-2' && (!roleFilter || roleFilter.val === 'Trainer')) {
                return { data: { id: 'mem-4', organization_id: 'org-owner-1', user_id: 'usr-trainer-2', role: 'Trainer', status: 'active', created_at: '2026-01-02T00:00:00Z' }, error: null };
              }
              if (targetUser === 'usr-frontdesk-1' && (!roleFilter || roleFilter.val === 'Front Desk')) {
                return { data: { id: 'mem-5', organization_id: 'org-owner-1', user_id: 'usr-frontdesk-1', role: 'Front Desk', status: 'active' }, error: null };
              }
              if (targetUser === 'usr-member-1' && (!roleFilter || roleFilter.val === 'Member')) {
                return { data: { id: 'mem-6', organization_id: 'org-owner-1', user_id: 'usr-member-1', role: 'Member', status: 'active' }, error: null };
              }
              if (targetUser === 'usr-member-2' && (!roleFilter || roleFilter.val === 'Member')) {
                return { data: { id: 'mem-7', organization_id: 'org-owner-1', user_id: 'usr-member-2', role: 'Member', status: 'active' }, error: null };
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
                id: uid,
                full_name: uid === 'usr-trainer-1' ? 'Coach Victor' : uid === 'usr-trainer-2' ? 'Coach Elena' : 'Client Alex',
                email: `${uid}@striva.app`,
                avatar_url: null,
              },
              error: null,
            };
          }

          if (table === 'trainer_member_assignments') {
            if (insertPayload) {
              const created = {
                id: `asg-created-${Date.now()}`,
                ...insertPayload,
              };
              assignmentsStore.push(created);
              return { data: created, error: null };
            }
            return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
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
            if (filterEqVal === 'usr-trainer-2') {
              return resolve({ data: [{ organization_id: 'org-owner-1', role: 'Trainer', user_id: 'usr-trainer-2' }], error: null });
            }
            if (filterEqVal === 'usr-frontdesk-1') {
              return resolve({ data: [{ organization_id: 'org-owner-1', role: 'Front Desk', user_id: 'usr-frontdesk-1' }], error: null });
            }
            if (filterEqVal === 'usr-member-1') {
              return resolve({ data: [{ organization_id: 'org-owner-1', role: 'Member', user_id: 'usr-member-1' }], error: null });
            }
            if (filterEqVal === 'usr-member-2') {
              return resolve({ data: [{ organization_id: 'org-owner-1', role: 'Member', user_id: 'usr-member-2' }], error: null });
            }

            const roleFilter = filters.find((f) => f.col === 'role');
            if (roleFilter?.val === 'Trainer') {
              return resolve({
                data: [
                  { id: 'mem-3', organization_id: 'org-owner-1', user_id: 'usr-trainer-1', role: 'Trainer', status: 'active', created_at: '2026-01-01T00:00:00Z', location_id: null },
                  { id: 'mem-4', organization_id: 'org-owner-1', user_id: 'usr-trainer-2', role: 'Trainer', status: 'active', created_at: '2026-01-02T00:00:00Z', location_id: null },
                ],
                error: null,
              });
            }

            return resolve({ data: [], error: null });
          }

          if (table === 'trainer_member_assignments') {
            if (updatePayload) {
              const idFilter = filters.find((f) => f.col === 'id');
              const rec = assignmentsStore.find((r) => r.id === idFilter?.val);
              if (rec) {
                Object.assign(rec, updatePayload);
                return resolve({ data: [rec], error: null });
              }
              return resolve({ data: [], error: null });
            }

            const orgFilter = filters.find((f) => f.col === 'organization_id');
            const trainerFilter = filters.find((f) => f.col === 'trainer_user_id');
            const statusFilter = filters.find((f) => f.col === 'status');

            const matches = assignmentsStore.filter(
              (r) =>
                (!orgFilter || r.organization_id === orgFilter.val) &&
                (!trainerFilter || r.trainer_user_id === trainerFilter.val) &&
                (!statusFilter || r.status === statusFilter.val)
            );
            return resolve({ data: matches, error: null });
          }

          if (table === 'profiles') {
            return resolve({
              data: [
                { id: 'usr-trainer-1', full_name: 'Coach Victor', email: 'trainer1@striva.app', avatar_url: null },
                { id: 'usr-trainer-2', full_name: 'Coach Elena', email: 'trainer2@striva.app', avatar_url: null },
                { id: 'usr-member-1', full_name: 'Client Alex', email: 'member1@striva.app', avatar_url: null },
                { id: 'usr-member-2', full_name: 'Client Sam', email: 'member2@striva.app', avatar_url: null },
              ],
              error: null,
            });
          }

          if (table === 'attendance_logs') {
            return resolve({ data: [], error: null });
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

describe('Phase 8F — Gym Owner Trainer Management & Member Assignments Security Suite', () => {
  beforeEach(async () => {
    const { supabase } = await import('../../src/database/supabase');
    (supabase as any)._resetStore();
  });

  // 1. Owner can view trainers
  it('1. Owner can view trainers', async () => {
    const res = await request(app)
      .get('/api/v1/trainers')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0]).toHaveProperty('assignedMemberCount');
  });

  // 2. Manager can view trainers
  it('2. Manager can view trainers', async () => {
    const res = await request(app)
      .get('/api/v1/trainers')
      .set('Authorization', 'Bearer token-manager');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 3. Member cannot access Owner trainer management
  it('3. Member cannot access Owner trainer management', async () => {
    const res = await request(app)
      .get('/api/v1/trainers')
      .set('Authorization', 'Bearer token-member-1');

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
  });

  // 4. Front Desk cannot manage trainers
  it('4. Front Desk cannot view trainer roster', async () => {
    const res = await request(app)
      .get('/api/v1/trainers')
      .set('Authorization', 'Bearer token-frontdesk');

    expect(res.status).toBe(403);
  });

  // 5. Trainer cannot manage other trainers (inspect other trainer details)
  it('5. Trainer cannot inspect another trainer details', async () => {
    const res = await request(app)
      .get('/api/v1/trainers/usr-trainer-2')
      .set('Authorization', 'Bearer token-trainer-1');

    expect(res.status).toBe(403);
  });

  // 6. Trainer can access only permitted own assignment data
  it('6. Trainer can access permitted own assignment data', async () => {
    const res = await request(app)
      .get('/api/v1/trainers/usr-trainer-1')
      .set('Authorization', 'Bearer token-trainer-1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userId).toBe('usr-trainer-1');
  });

  // 7. Demo cannot access trainer management
  it('7. Demo cannot access trainer management', async () => {
    const res = await request(app)
      .get('/api/v1/trainers')
      .set('Authorization', 'Bearer token-demo');

    expect(res.status).toBe(403);
  });

  // 8. Cross-tenant trainer lookup rejected
  it('8. Cross-tenant trainer lookup rejected', async () => {
    const res = await request(app)
      .get('/api/v1/trainers/usr-trainer-other')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(404);
  });

  // 9. Cross-tenant member lookup rejected during assignment
  it('9. Cross-tenant member lookup rejected during assignment', async () => {
    const res = await request(app)
      .post('/api/v1/trainers/assignments')
      .set('Authorization', 'Bearer token-owner')
      .send({
        trainerUserId: 'usr-trainer-1',
        memberUserId: 'usr-foreign-999',
      });

    expect(res.status).toBe(403);
    const msg = res.body.error?.message || res.body.error;
    expect(msg).toMatch(/not an eligible member/i);
  });

  // 10. Cross-tenant assignment rejected (foreign trainer)
  it('10. Cross-tenant assignment rejected', async () => {
    const res = await request(app)
      .post('/api/v1/trainers/assignments')
      .set('Authorization', 'Bearer token-owner')
      .send({
        trainerUserId: 'usr-trainer-other',
        memberUserId: 'usr-member-2',
      });

    expect(res.status).toBe(403);
    const msg = res.body.error?.message || res.body.error;
    expect(msg).toMatch(/not an active trainer/i);
  });

  // 11. Unauthorized role assignment rejected (Member attempting to assign)
  it('11. Unauthorized role assignment rejected', async () => {
    const res = await request(app)
      .post('/api/v1/trainers/assignments')
      .set('Authorization', 'Bearer token-member-1')
      .send({
        trainerUserId: 'usr-trainer-1',
        memberUserId: 'usr-member-2',
      });

    expect(res.status).toBe(403);
  });

  // 12. Member cannot self-assign as trainer
  it('12. Member cannot self-assign as trainer', async () => {
    const res = await request(app)
      .post('/api/v1/trainers/assignments')
      .set('Authorization', 'Bearer token-owner')
      .send({
        trainerUserId: 'usr-member-1',
        memberUserId: 'usr-member-1',
      });

    expect(res.status).toBe(400);
    const msg = res.body.error?.message || res.body.error;
    expect(msg).toMatch(/cannot be assigned to themselves/i);
  });

  // 13. Owner can assign member to trainer
  it('13. Owner can assign member to trainer', async () => {
    const res = await request(app)
      .post('/api/v1/trainers/assignments')
      .set('Authorization', 'Bearer token-owner')
      .send({
        trainerUserId: 'usr-trainer-2',
        memberUserId: 'usr-member-2',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.trainer_user_id).toBe('usr-trainer-2');
    expect(res.body.data.member_user_id).toBe('usr-member-2');
  });

  // 14. Manager can assign member to trainer
  it('14. Manager can assign member to trainer', async () => {
    const res = await request(app)
      .post('/api/v1/trainers/assignments')
      .set('Authorization', 'Bearer token-manager')
      .send({
        trainerUserId: 'usr-trainer-1',
        memberUserId: 'usr-member-2',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  // 15. Duplicate active assignment rejected
  it('15. Duplicate active assignment rejected', async () => {
    // usr-member-1 is already assigned to usr-trainer-1
    const res = await request(app)
      .post('/api/v1/trainers/assignments')
      .set('Authorization', 'Bearer token-owner')
      .send({
        trainerUserId: 'usr-trainer-1',
        memberUserId: 'usr-member-1',
      });

    expect(res.status).toBe(409);
    const msg = res.body.error?.message || res.body.error;
    expect(msg).toMatch(/already actively assigned/i);
  });

  // 16. Reassignment is organization scoped (assigning to another trainer reassigns member)
  it('16. Reassignment is organization scoped', async () => {
    // usr-member-1 is assigned to trainer 1, reassigning to trainer 2 succeeds and deactivates old
    const res = await request(app)
      .post('/api/v1/trainers/assignments')
      .set('Authorization', 'Bearer token-owner')
      .send({
        trainerUserId: 'usr-trainer-2',
        memberUserId: 'usr-member-1',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.trainer_user_id).toBe('usr-trainer-2');
  });

  // 17. Removing assignment is authorized for Owner
  it('17. Removing assignment is authorized for Owner', async () => {
    const res = await request(app)
      .delete('/api/v1/trainers/assignments/asg-active-1')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 18. Unauthorized user cannot remove assignment
  it('18. Unauthorized user cannot remove assignment', async () => {
    const res = await request(app)
      .delete('/api/v1/trainers/assignments/asg-active-1')
      .set('Authorization', 'Bearer token-member-1');

    expect(res.status).toBe(403);
  });

  // 19. No unauthorized sensitive member fields returned
  it('19. No unauthorized sensitive member fields returned', async () => {
    const res = await request(app)
      .get('/api/v1/trainers/usr-trainer-1')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    const trainer = res.body.data;
    expect(trainer).not.toHaveProperty('password');
    expect(trainer).not.toHaveProperty('ai_memory');
    expect(trainer).not.toHaveProperty('payment_token');
  });

  // 20. Network failure does not produce mock trainer data
  it('20. Nonexistent assignment delete fails cleanly without fallback', async () => {
    const res = await request(app)
      .delete('/api/v1/trainers/assignments/asg-nonexistent')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(404);
  });

  // 21. Consumer billing remains unaffected
  it('21. Consumer billing remains unaffected by trainer operations', async () => {
    const res = await request(app)
      .get('/api/v1/billing/status')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('active');
  });

  // 22. Attendance remains unaffected
  it('22. Attendance remains unaffected by trainer operations', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/today')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('currentlyInsideCount');
  });
});
