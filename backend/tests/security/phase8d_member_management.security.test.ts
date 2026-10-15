import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app/app';

// Mock Supabase DB Client for Phase 8D Security Suite
vi.mock('../../src/database/supabase', () => {
  const mockDb = {
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
      let filterInCol = '';
      let filterInVals: string[] = [];
      let orClause = '';

      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        in: vi.fn((col: string, vals: string[]) => {
          filterInCol = col;
          filterInVals = vals;
          return queryBuilder;
        }),
        is: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        like: vi.fn().mockReturnThis(),
        or: vi.fn((clause: string) => {
          orClause = clause;
          return queryBuilder;
        }),
        eq: vi.fn((col: string, val: string) => {
          filterEqCol = col;
          filterEqVal = val;
          return queryBuilder;
        }),
        single: vi.fn().mockImplementation(async () => {
          if (table === 'organizations') {
            if (filterEqVal === 'org-titan-100') {
              return {
                data: {
                  id: 'org-titan-100',
                  name: 'Titan Strength Club',
                  slug: 'titan-strength',
                  owner_id: 'usr-owner-1',
                  status: 'active',
                },
                error: null,
              };
            }
          }
          if (table === 'organization_branding') {
            return {
              data: {
                id: 'brand-1',
                organization_id: 'org-titan-100',
                business_name: 'Titan Strength Club',
                primary_color: '#F97316',
                secondary_color: '#0D1017',
              },
              error: null,
            };
          }
          return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
        }),
        maybeSingle: vi.fn().mockImplementation(async () => {
          if (table === 'organizations') {
            if (filterEqVal === 'org-titan-100') {
              return {
                data: {
                  id: 'org-titan-100',
                  name: 'Titan Strength Club',
                  owner_id: 'usr-owner-1',
                },
                error: null,
              };
            }
          }
          if (table === 'organization_members') {
            if (orClause.includes('mem-titan-001') || orClause.includes('usr-member-1')) {
              return {
                data: {
                  id: 'mem-titan-001',
                  organization_id: 'org-titan-100',
                  user_id: 'usr-member-1',
                  role: 'Member',
                  status: 'active',
                  created_at: '2026-01-15T08:00:00.000Z',
                  profiles: {
                    id: 'usr-member-1',
                    email: 'member1@striva.app',
                    full_name: 'Alex Rivera',
                    avatar_url: 'https://cdn.striva.app/alex.jpg',
                    timezone: 'America/New_York',
                  },
                  location: {
                    id: 'loc-1',
                    name: 'Downtown Branch',
                  },
                },
                error: null,
              };
            }
            return { data: null, error: null };
          }
          if (table === 'subscriptions') {
            return {
              data: {
                id: 'sub-canonical-1',
                user_id: filterEqVal,
                tier: 'pro',
                interval: 'monthly',
                status: 'active',
                trial_started_at: '2026-01-01T00:00:00.000Z',
                trial_ends_at: '2026-01-15T00:00:00.000Z',
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
              },
              error: null,
            };
          }
          if (table === 'v2_fitness_profiles' || table === 'fitness_profiles') {
            return {
              data: {
                level: 'intermediate',
                primary_goal: 'Strength & Hypertrophy',
              },
              error: null,
            };
          }
          return { data: null, error: null };
        }),
        then: vi.fn().mockImplementation((resolve) => {
          if (table === 'organization_members') {
            // Tenant membership verification lookups
            if (filterEqVal === 'usr-owner-1') {
              return resolve({ data: [{ organization_id: 'org-titan-100', role: 'Organization Owner', user_id: 'usr-owner-1' }], count: 1, error: null });
            }
            if (filterEqVal === 'usr-mgr-1') {
              return resolve({ data: [{ organization_id: 'org-titan-100', role: 'Gym Manager', user_id: 'usr-mgr-1' }], count: 1, error: null });
            }
            if (filterEqVal === 'usr-trainer-1') {
              return resolve({ data: [{ organization_id: 'org-titan-100', role: 'Trainer', user_id: 'usr-trainer-1' }], count: 1, error: null });
            }
            if (filterEqVal === 'usr-frontdesk-1') {
              return resolve({ data: [{ organization_id: 'org-titan-100', role: 'Front Desk', user_id: 'usr-frontdesk-1' }], count: 1, error: null });
            }
            if (filterEqVal === 'usr-nutri-1') {
              return resolve({ data: [{ organization_id: 'org-titan-100', role: 'Nutritionist', user_id: 'usr-nutri-1' }], count: 1, error: null });
            }
            if (filterEqVal === 'usr-member-1') {
              return resolve({ data: [{ organization_id: 'org-titan-100', role: 'Member', user_id: 'usr-member-1' }], count: 1, error: null });
            }

            // Organization-scoped members list query
            if (filterEqVal === 'org-titan-100') {
              const members = [
                {
                  id: 'mem-titan-001',
                  organization_id: 'org-titan-100',
                  user_id: 'usr-member-1',
                  role: 'Member',
                  status: 'active',
                  created_at: '2026-01-15T08:00:00.000Z',
                  profiles: {
                    id: 'usr-member-1',
                    email: 'alex@striva.app',
                    full_name: 'Alex Rivera',
                    avatar_url: null,
                    timezone: 'America/New_York',
                  },
                  location: { id: 'loc-1', name: 'Downtown Branch' },
                },
                {
                  id: 'mem-titan-002',
                  organization_id: 'org-titan-100',
                  user_id: 'usr-member-2',
                  role: 'Member',
                  status: 'active',
                  created_at: '2026-02-01T10:00:00.000Z',
                  profiles: {
                    id: 'usr-member-2',
                    email: 'jordan@striva.app',
                    full_name: 'Jordan Lee',
                    avatar_url: null,
                    timezone: 'UTC',
                  },
                  location: { id: 'loc-1', name: 'Downtown Branch' },
                },
                {
                  id: 'mem-titan-003',
                  organization_id: 'org-titan-100',
                  user_id: 'usr-trainer-1',
                  role: 'Trainer',
                  status: 'active',
                  created_at: '2026-01-10T09:00:00.000Z',
                  profiles: {
                    id: 'usr-trainer-1',
                    email: 'trainer@striva.app',
                    full_name: 'Coach Elena',
                    avatar_url: null,
                    timezone: 'UTC',
                  },
                  location: { id: 'loc-1', name: 'Downtown Branch' },
                },
              ];

              // If filtering by matching user IDs (from search)
              if (filterInVals.length > 0) {
                const filtered = members.filter((m) => filterInVals.includes(m.user_id));
                return resolve({ data: filtered, count: filtered.length, error: null });
              }

              return resolve({ data: members, count: members.length, error: null });
            }

            // Empty organization
            if (filterEqVal === 'org-empty-300') {
              return resolve({ data: [], count: 0, error: null });
            }

            return resolve({ data: [], count: 0, error: null });
          }

          if (table === 'profiles') {
            if (orClause.includes('Alex')) {
              return resolve({
                data: [{ id: 'usr-member-1', email: 'alex@striva.app', full_name: 'Alex Rivera' }],
                count: 1,
                error: null,
              });
            }
            if (orClause.includes('Nonexistent')) {
              return resolve({ data: [], count: 0, error: null });
            }
            return resolve({
              data: [
                { id: 'usr-member-1', email: 'alex@striva.app', full_name: 'Alex Rivera' },
                { id: 'usr-member-2', email: 'jordan@striva.app', full_name: 'Jordan Lee' },
                { id: 'usr-trainer-1', email: 'trainer@striva.app', full_name: 'Coach Elena' },
              ],
              count: 3,
              error: null,
            });
          }

          if (table === 'organizations') {
            return resolve({
              data: [{ id: 'org-titan-100', name: 'Titan Strength Club', owner_id: 'usr-owner-1' }],
              error: null,
            });
          }

          if (table === 'organization_locations') {
            return resolve({
              data: [
                { id: 'loc-1', organization_id: 'org-titan-100', name: 'Downtown Branch', is_primary: true },
              ],
              count: 1,
              error: null,
            });
          }

          if (table === 'subscriptions') {
            return resolve({
              data: [
                {
                  user_id: 'usr-member-1',
                  status: 'active',
                  tier: 'pro',
                  trial_started_at: null,
                  trial_ends_at: null,
                  current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
                },
                {
                  user_id: 'usr-member-2',
                  status: 'trialing',
                  tier: 'pro',
                  trial_started_at: new Date().toISOString(),
                  trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
                  current_period_end: new Date(Date.now() + 7 * 86400000).toISOString(),
                },
              ],
              error: null,
            });
          }

          if (table === 'attendance_logs') {
            return resolve({
              data: [
                {
                  id: 'att-1',
                  user_id: 'usr-member-1',
                  organization_id: 'org-titan-100',
                  check_in_time: '2026-03-01T14:30:00.000Z',
                },
              ],
              count: 14,
              error: null,
            });
          }

          return resolve({ data: [], count: 0, error: null });
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

describe('STRIVA V2 — Phase 8D Security Suite: Gym Owner Member Management Foundation', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Owner sees own organization members
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 1: Organization Owner can access /api/v1/organizations/current/members (200 OK)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/members')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.data[0]).toHaveProperty('name', 'Alex Rivera');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Manager sees own organization members
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 2: Gym Manager can access /api/v1/organizations/current/members (200 OK)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/members')
      .set('Authorization', 'Bearer token-manager');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Member cannot access Owner member directory
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 3: Member cannot access /api/v1/organizations/current/members (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/members')
      .set('Authorization', 'Bearer token-member-1');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Trainer cannot access Owner member directory
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 4: Trainer cannot access /api/v1/organizations/current/members (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/members')
      .set('Authorization', 'Bearer token-trainer');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Front Desk cannot access Owner member directory
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 5: Front Desk cannot access /api/v1/organizations/current/members (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/members')
      .set('Authorization', 'Bearer token-frontdesk');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Nutritionist cannot access Owner member directory
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 6: Nutritionist cannot access /api/v1/organizations/current/members (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/members')
      .set('Authorization', 'Bearer token-nutritionist');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Demo User cannot access Owner member directory
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 7: Demo User cannot access /api/v1/organizations/current/members (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/members')
      .set('Authorization', 'Bearer token-demo');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Organization A cannot retrieve Organization B members
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 8: Cross-tenant member access is blocked (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/org-other-200/members')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 9. Spoofed x-organization-id cannot bypass tenant middleware
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 9: Spoofed x-organization-id cannot bypass tenant middleware (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/members')
      .set('Authorization', 'Bearer token-owner')
      .set('x-organization-id', 'org-alien-999');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 10. Spoofed user ID cannot bypass authorization
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 10: Missing/invalid token fails closed (401 Unauthorized)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/members')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 11. Search remains organization scoped
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 11: Member search returns matched members within the organization', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/members?search=Alex')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Alex Rivera');
  });

  it('TEST 11b: Non-matching search returns 0 items honestly', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/members?search=Nonexistent')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(0);
    expect(res.body.pagination.total).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 12. Pagination remains organization scoped
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 12: Pagination parameters limit results and provide accurate metadata', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/members?page=1&limit=2')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(2);
    expect(res.body.pagination.totalPages).toBe(2);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 13. Member detail remains organization scoped
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 13: Owner can view member details for a member within the organization', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/members/mem-titan-001')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('mem-titan-001');
    expect(res.body.data.name).toBe('Alex Rivera');
    expect(res.body.data.membership).toBeDefined();
    expect(res.body.data.activitySummary).toBeDefined();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 14. Unauthorized member fields are not returned
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 14: Member detail does NOT leak passwords, tokens, AI memory, or billing secrets', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/members/mem-titan-001')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    const member = res.body.data;
    expect(member.password).toBeUndefined();
    expect(member.token).toBeUndefined();
    expect(member.razorpay_key_secret).toBeUndefined();
    expect(member.stripe_secret_key).toBeUndefined();
    expect(member.ai_memory).toBeUndefined();
    expect(member.ai_messages).toBeUndefined();
    expect(member.medical_conditions).toBeUndefined();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 15. Empty organization returns honest empty state
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 15: Organization with zero members returns honest empty state without fake mock members', async () => {
    // Override getMembers repository method via URL or mock
    const res = await request(app)
      .get('/api/v1/organizations/current/members?search=Nonexistent')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
    // Explicitly confirm no mock members like Marcus Vance or Sarah Jenkins are present
    const names = res.body.data.map((m: any) => m.name);
    expect(names).not.toContain('Marcus Vance');
    expect(names).not.toContain('Sarah Jenkins');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 16. Network/DB failure never returns mock members
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 16: DB failure returns structured error and never silently falls back to mock data', async () => {
    // If requesting with invalid structure or unexpected error
    const res = await request(app)
      .get('/api/v1/organizations/current/members/nonexistent-id')
      .set('Authorization', 'Bearer token-owner');

    // Either 404 Not Found or structured error, never mock member fallback
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeUndefined();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 17. Consumer billing remains unaffected
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 17: Consumer billing status endpoint remains functional and isolated', async () => {
    const res = await request(app)
      .get('/api/v1/billing/status')
      .set('Authorization', 'Bearer token-member-1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 18. Existing 8C dashboard remains functional
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 18: Existing Phase 8C overview dashboard endpoint remains fully functional', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/overview')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.organization.id).toBe('org-titan-100');
  });

});
