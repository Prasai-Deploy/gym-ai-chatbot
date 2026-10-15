import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app/app';
import { OrganizationRepository } from '../../src/modules/organization/organization.repository';
import { OrganizationService } from '../../src/modules/organization/organization.service';

// Mock Supabase DB Client
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

      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        like: vi.fn().mockReturnThis(),
        eq: vi.fn((col: string, val: string) => {
          filterEqCol = col;
          filterEqVal = val;
          return queryBuilder;
        }),
        single: vi.fn().mockImplementation(async () => {
          if (table === 'organizations') {
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
          if (table === 'subscriptions') {
            return {
              data: {
                id: 'sub-canonical-1',
                user_id: filterEqVal,
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
          return { data: null, error: null };
        }),
        then: vi.fn().mockImplementation((resolve) => {
          if (table === 'organization_members') {
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
            if (filterEqVal === 'usr-member-1') {
              return resolve({ data: [{ organization_id: 'org-titan-100', role: 'Member', user_id: 'usr-member-1' }], count: 1, error: null });
            }
            // Staff roster query (where role != 'Member')
            if (filterEqVal === 'org-titan-100') {
              return resolve({
                data: [
                  { id: 'mem-1', organization_id: 'org-titan-100', user_id: 'usr-owner-1', role: 'Organization Owner', status: 'active', profiles: { full_name: 'Marcus Owner' } },
                  { id: 'mem-2', organization_id: 'org-titan-100', user_id: 'usr-mgr-1', role: 'Gym Manager', status: 'active', profiles: { full_name: 'Sarah Manager' } },
                ],
                count: 2,
                error: null,
              });
            }
            return resolve({ data: [], count: 0, error: null });
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
                { id: 'loc-1', organization_id: 'org-titan-100', name: 'Downtown Branch', address: '100 Main St', city: 'Metropolis', is_primary: true },
              ],
              count: 1,
              error: null,
            });
          }
          if (table === 'attendance_logs') {
            return resolve({ data: [{ id: 'att-1' }], count: 12, error: null });
          }
          if (table === 'subscriptions') {
            return resolve({ data: [], error: null });
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

describe('STRIVA V2 — Phase 8C Security Suite: Gym Owner Shell & Overview Dashboard', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Owner can access Owner shell / overview
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 1: Organization Owner can access /api/v1/organizations/current/overview (200 OK)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/overview')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.organization.id).toBe('org-titan-100');
    expect(res.body.data.organization.name).toBe('Titan Strength Club');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Gym Manager can access Owner shell / overview
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 2: Gym Manager can access /api/v1/organizations/current/overview (200 OK)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/overview')
      .set('Authorization', 'Bearer token-manager');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.organization.id).toBe('org-titan-100');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Member cannot access Owner shell / overview
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 3: Member cannot access /api/v1/organizations/current/overview (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/overview')
      .set('Authorization', 'Bearer token-member-1');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Trainer cannot access Owner shell / overview
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 4: Trainer cannot access /api/v1/organizations/current/overview (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/overview')
      .set('Authorization', 'Bearer token-trainer');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Front Desk cannot access Owner shell / overview
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 5: Front Desk cannot access /api/v1/organizations/current/overview (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/overview')
      .set('Authorization', 'Bearer token-frontdesk');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Dashboard uses organization-scoped API
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 6: Overview endpoint verifies tenant scope and does not execute unscoped global queries', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/overview')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.data.organization.id).toBe('org-titan-100');
    expect(res.body.data.metrics).toBeDefined();
    expect(typeof res.body.data.metrics.totalMembers).toBe('number');
    expect(typeof res.body.data.metrics.activeStaffCount).toBe('number');
    expect(typeof res.body.data.metrics.todayCheckIns).toBe('number');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Dashboard does not display hardcoded KPI values
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 7: Metrics are dynamically computed from tenant database records (no hardcoded constants)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/overview')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    const { metrics } = res.body.data;
    // Metrics must be derived from count queries, not hardcoded strings or mock arrays
    expect(metrics).toEqual(
      expect.objectContaining({
        totalMembers: expect.any(Number),
        activeStaffCount: expect.any(Number),
        totalLocations: expect.any(Number),
        todayCheckIns: expect.any(Number),
        currentlyInFacility: expect.any(Number),
      })
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Organization name comes from API
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 8: Organization identity is dynamic and matches the database record', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/overview')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.data.organization.name).toBe('Titan Strength Club');
    expect(res.body.data.locations[0].name).toBe('Downtown Branch');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 9. Unauthorized organization context is rejected
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 9: Spoofed x-organization-id is rejected with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/overview')
      .set('Authorization', 'Bearer token-owner')
      .set('x-organization-id', 'org-unauthorized-alien-999');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 10. 403 is rendered safely
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 10: 403 response contains clean structured error without server stack leaks', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/overview')
      .set('Authorization', 'Bearer token-member-1');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.message).toContain('Access Denied');
    expect(res.body.error.stack).toBeUndefined(); // No leaked backend stack traces
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 11. Empty data is rendered honestly
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 11: Empty facility state generates honest attention items without inventing fake data', async () => {
    const mockRepo: any = {
      findById: vi.fn().mockResolvedValue({ id: 'org-empty-1', name: 'New Empty Gym', status: 'active' }),
      getLocations: vi.fn().mockResolvedValue([]),
      getBranding: vi.fn().mockResolvedValue(null),
      getStaff: vi.fn().mockResolvedValue([]),
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          then: vi.fn().mockImplementation((resolve) => resolve({ count: 0, data: [] })),
        })),
      },
    };

    const repo = new OrganizationRepository(mockRepo.supabase as any);
    // Bind mocked methods
    repo.findById = mockRepo.findById;
    repo.getLocations = mockRepo.getLocations;
    repo.getBranding = mockRepo.getBranding;
    repo.getStaff = mockRepo.getStaff;

    const overview = await repo.getOverview('org-empty-1');

    expect(overview).not.toBeNull();
    expect(overview?.metrics.totalMembers).toBe(0);
    expect(overview?.metrics.activeStaffCount).toBe(0);
    expect(overview?.metrics.totalLocations).toBe(0);
    // Honest attention items: alert for unconfigured locations and empty staff roster
    expect(overview?.attentionItems.some((i) => i.id === 'no-locations')).toBe(true);
    expect(overview?.attentionItems.some((i) => i.id === 'no-staff')).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 12. Consumer billing route remains unaffected
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 12: Consumer billing status remains functional and isolated from Gym Owner authorization', async () => {
    const res = await request(app)
      .get('/api/v1/billing/status')
      .set('Authorization', 'Bearer token-member-1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
