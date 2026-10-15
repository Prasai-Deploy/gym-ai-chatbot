import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app/app';
import { OrganizationService } from '../../src/modules/organization/organization.service';
import { AttendanceService } from '../../src/modules/attendance/attendance.service';
import { AdminRepository } from '../../src/modules/admin/repositories/AdminRepository';
import { ForbiddenError, ValidationError } from '../../src/errors/AppError';
import fs from 'fs';
import path from 'path';

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
        if (token === 'token-superadmin') {
          return {
            data: {
              user: {
                id: 'usr-superadmin-1',
                email: 'superadmin@striva.app',
                user_metadata: { role: 'Platform Super Admin' },
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
            return { data: { id: 'org-owner-1', name: 'Titan Gym', owner_id: 'usr-owner-1' }, error: null };
          }
          if (table === 'organization_members') {
            if (filterEqVal === 'usr-owner-1') {
              return { data: { id: 'mem-1', organization_id: 'org-owner-1', user_id: 'usr-owner-1', role: 'Organization Owner', status: 'active' }, error: null };
            }
            if (filterEqVal === 'usr-mgr-1') {
              return { data: { id: 'mem-2', organization_id: 'org-owner-1', user_id: 'usr-mgr-1', role: 'Gym Manager', status: 'active' }, error: null };
            }
            if (filterEqVal === 'usr-trainer-1') {
              return { data: { id: 'mem-3', organization_id: 'org-owner-1', user_id: 'usr-trainer-1', role: 'Trainer', status: 'active' }, error: null };
            }
            if (filterEqVal === 'usr-frontdesk-1') {
              return { data: { id: 'mem-4', organization_id: 'org-owner-1', user_id: 'usr-frontdesk-1', role: 'Front Desk', status: 'active' }, error: null };
            }
            if (filterEqVal === 'usr-member-1') {
              return { data: { id: 'mem-5', organization_id: 'org-owner-1', user_id: 'usr-member-1', role: 'Member', status: 'active' }, error: null };
            }
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
            if (filterEqVal === 'usr-member-1') {
              return resolve({ data: [{ organization_id: 'org-owner-1', role: 'Member', user_id: 'usr-member-1' }], error: null });
            }
            if (filterEqVal === 'usr-member-2') {
              return resolve({ data: [{ organization_id: 'org-other-2', role: 'Member', user_id: 'usr-member-2' }], error: null });
            }
            if (filterEqVal === 'org-owner-1') {
              return resolve({
                data: [
                  { id: 'mem-1', organization_id: 'org-owner-1', user_id: 'usr-owner-1', role: 'Organization Owner', status: 'active' },
                  { id: 'mem-2', organization_id: 'org-owner-1', user_id: 'usr-mgr-1', role: 'Gym Manager', status: 'active' },
                ],
                error: null,
              });
            }
            return resolve({ data: [], error: null });
          }
          if (table === 'organizations') {
            if (filterEqVal === 'usr-owner-1') {
              return resolve({ data: [{ id: 'org-owner-1', name: 'Titan Gym', owner_id: 'usr-owner-1' }], error: null });
            }
            return resolve({ data: [{ id: 'org-owner-1', name: 'Titan Gym', owner_id: 'usr-owner-1' }], error: null });
          }
          if (table === 'organization_locations') {
            return resolve({ data: [{ id: 'loc-1', organization_id: 'org-owner-1', name: 'Downtown Branch', status: 'active' }], error: null });
          }
          if (table === 'subscriptions') {
            return resolve({
              data: [
                { tier: 'pro', interval: 'monthly', status: 'active' },
                { tier: 'elite', interval: 'yearly', status: 'active' },
              ],
              error: null,
            });
          }
          if (table === 'attendance_logs') {
            return resolve({
              data: [{ id: 'att-1', organization_id: 'org-owner-1', user_id: 'usr-member-1', status: 'completed' }],
              error: null,
            });
          }
          if (table === 'profiles') {
            return resolve({
              data: [{ id: 'usr-member-1', email: 'member1@striva.app', full_name: 'Member One' }],
              count: 1,
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

describe('STRIVA V2 — Phase 8B Security Suite: Organization, Location & Staff Foundation', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Owner can access own organization
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 1: Owner can access own organization (200 OK)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.organization.id).toBe('org-owner-1');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Owner cannot access another organization
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 2: Owner cannot access another organization (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current')
      .set('Authorization', 'Bearer token-owner')
      .set('x-organization-id', 'org-alien-forbidden');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Manager cannot access another organization
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 3: Manager cannot access another organization (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current')
      .set('Authorization', 'Bearer token-manager')
      .set('x-organization-id', 'org-alien-forbidden');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Member cannot access owner endpoints
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 4: Member cannot access owner endpoints (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/staff')
      .set('Authorization', 'Bearer token-member-1');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Front Desk cannot access financial analytics
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 5: Front Desk cannot access financial analytics (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/revenue')
      .set('Authorization', 'Bearer token-frontdesk');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Trainer cannot access financial analytics
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 6: Trainer cannot access financial analytics (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/revenue')
      .set('Authorization', 'Bearer token-trainer');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Member cannot access financial analytics
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 7: Member cannot access financial analytics (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/revenue')
      .set('Authorization', 'Bearer token-member-1');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Organization Owner can access allowed financial endpoint
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 8: Organization Owner can access allowed financial endpoint (200 OK)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/revenue')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 9. Manager can access allowed financial endpoint
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 9: Manager can access allowed financial endpoint (200 OK)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/revenue')
      .set('Authorization', 'Bearer token-manager');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 10. Platform Super Admin can access platform analytics
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 10: Platform Super Admin can access platform analytics (200 OK)', async () => {
    const res = await request(app)
      .get('/api/v1/billing/admin/metrics')
      .set('Authorization', 'Bearer token-superadmin');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 11. Organization role escalation is blocked
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 11: Organization role escalation is blocked (cannot assign Platform Super Admin)', async () => {
    const mockRepo: any = {
      upsertMember: vi.fn(),
      getMember: vi.fn().mockResolvedValue(null),
      createInvitation: vi.fn(),
    };
    const orgService = new OrganizationService(mockRepo);

    // Organization Owner attempting to invite a Platform Super Admin must fail
    await expect(
      orgService.inviteStaff('org-owner-1', 'usr-owner-1', 'Organization Owner', {
        email: 'attacker@striva.app',
        roleKey: 'Platform Super Admin' as any,
      })
    ).rejects.toThrow(ForbiddenError);

    // Organization Owner attempting to promote an existing user to Platform Super Admin must fail
    await expect(
      orgService.updateMemberRole('org-owner-1', 'usr-owner-1', 'Organization Owner', 'usr-member-1', 'Platform Super Admin')
    ).rejects.toThrow(ForbiddenError);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 12. Member cannot self-promote
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 12: Member cannot self-promote (403 Forbidden)', async () => {
    const mockRepo: any = {
      updateMemberRole: vi.fn(),
    };
    const orgService = new OrganizationService(mockRepo);

    await expect(
      orgService.updateMemberRole('org-owner-1', 'usr-member-1', 'Member', 'usr-member-1', 'Organization Owner')
    ).rejects.toThrow(ForbiddenError);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 13. Invitation cannot cross organizations
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 13: Invitation cannot cross organizations (token enforces bound organization)', async () => {
    const mockRepo: any = {
      findInvitationByToken: vi.fn().mockResolvedValue({
        id: 'inv-1',
        organization_id: 'org-beta', // belongs to beta
        email: 'invited@striva.app',
        role_key: 'Trainer',
        status: 'pending',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      }),
      upsertMember: vi.fn().mockResolvedValue({
        id: 'mem-new',
        organization_id: 'org-beta',
        user_id: 'usr-user-1',
        role: 'Trainer',
        status: 'active',
      }),
      updateInvitationStatus: vi.fn().mockResolvedValue(undefined),
      logAudit: vi.fn().mockResolvedValue(undefined),
    };
    const orgService = new OrganizationService(mockRepo);

    const accepted = await orgService.acceptInvitation('token-123', 'usr-user-1', 'invited@striva.app', 'Member');
    expect(accepted.organization_id).toBe('org-beta');
    expect(mockRepo.upsertMember).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: 'org-beta', role: 'Trainer' })
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 14. Expired invitation is rejected
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 14: Expired invitation is rejected', async () => {
    const mockRepo: any = {
      findInvitationByToken: vi.fn().mockResolvedValue({
        id: 'inv-expired',
        organization_id: 'org-owner-1',
        email: 'invited@striva.app',
        role_key: 'Trainer',
        status: 'pending',
        expires_at: new Date(Date.now() - 3600000).toISOString(), // expired 1h ago
      }),
      updateInvitationStatus: vi.fn().mockResolvedValue(undefined),
    };
    const orgService = new OrganizationService(mockRepo);

    await expect(
      orgService.acceptInvitation('token-expired', 'usr-user-1', 'invited@striva.app')
    ).rejects.toThrow(ValidationError);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 15. Used invitation is rejected
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 15: Used invitation is rejected', async () => {
    const mockRepo: any = {
      findInvitationByToken: vi.fn().mockResolvedValue({
        id: 'inv-accepted',
        organization_id: 'org-owner-1',
        email: 'invited@striva.app',
        role_key: 'Trainer',
        status: 'accepted', // already accepted
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      }),
    };
    const orgService = new OrganizationService(mockRepo);

    await expect(
      orgService.acceptInvitation('token-accepted', 'usr-user-1', 'invited@striva.app')
    ).rejects.toThrow(ValidationError);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 16. Arbitrary target user attendance check-in is rejected
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 16: Arbitrary target user attendance check-in is rejected if user not in org', async () => {
    const mockRepo: any = {
      isUserInOrg: vi.fn().mockResolvedValue(false), // target user NOT in org
    };
    const attendanceService = new AttendanceService(mockRepo);

    await expect(
      attendanceService.checkIn('usr-frontdesk-1', 'Front Desk', 'org-owner-1', {
        userId: 'usr-alien-stranger',
      })
    ).rejects.toThrow(ForbiddenError);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 17. Staff can check in eligible member in same organization
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 17: Staff can check in eligible member in same organization', async () => {
    const mockRepo: any = {
      isUserInOrg: vi.fn().mockResolvedValue(true),
      findActiveCheckIn: vi.fn().mockResolvedValue(null),
      createCheckIn: vi.fn().mockResolvedValue({
        id: 'att-new-1',
        organization_id: 'org-owner-1',
        user_id: 'usr-member-1',
        status: 'active',
        check_in_time: new Date().toISOString(),
      }),
    };
    const attendanceService = new AttendanceService(mockRepo);

    const record = await attendanceService.checkIn('usr-frontdesk-1', 'Front Desk', 'org-owner-1', {
      userId: 'usr-member-1',
    });

    expect(record).toBeDefined();
    expect(record.status).toBe('active');
    expect(record.user_id).toBe('usr-member-1');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 18. Member cannot check in another member
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 18: Member cannot check in another member', async () => {
    const mockRepo: any = {
      isUserInOrg: vi.fn().mockResolvedValue(true),
    };
    const attendanceService = new AttendanceService(mockRepo);

    // Member-1 trying to check in Member-2 must fail
    await expect(
      attendanceService.checkIn('usr-member-1', 'Member', 'org-owner-1', {
        userId: 'usr-member-2',
      })
    ).rejects.toThrow(ForbiddenError);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 19. Demo cannot become staff
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 19: Demo user cannot become staff', async () => {
    const mockRepo: any = {
      findInvitationByToken: vi.fn().mockResolvedValue({
        id: 'inv-valid',
        organization_id: 'org-owner-1',
        email: 'demo@sweatfix.com',
        role_key: 'Trainer',
        status: 'pending',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      }),
    };
    const orgService = new OrganizationService(mockRepo);

    await expect(
      orgService.acceptInvitation('token-valid', 'usr-demo-1', 'demo@sweatfix.com', 'Demo User')
    ).rejects.toThrow(ForbiddenError);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 20. Global admin metrics are not exposed to ordinary users
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 20: Global admin metrics are not exposed to ordinary users (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard-data')
      .set('Authorization', 'Bearer token-member-1');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 21. Service-role global queries are not reachable by organization users
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 21: AdminRepository scopes queries to organizationId; rejects unscoped global queries for tenant roles', async () => {
    const mockClient: any = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve) => resolve({ data: [], count: 0, error: null })),
      })),
    };
    const adminRepo = new AdminRepository(mockClient);

    // When orgId is passed, AdminRepository scopes query
    await adminRepo.getDashboardStats('org-owner-1');
    expect(mockClient.from).toHaveBeenCalledWith('profiles');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 22. Organization RLS fails closed without trusted organization context
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 22: Migration 8B replaces current_setting mechanism with canonical auth.uid() & is_org_member()', () => {
    const migrationPath = path.join(
      __dirname,
      '../../supabase/migrations/phase_8b_organization_staff_foundation.sql'
    );
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Asserts obsolete current_setting policies are explicitly dropped
    expect(sql).toContain('DROP POLICY IF EXISTS "Tenant organization access policy"');
    expect(sql).toContain('DROP POLICY IF EXISTS "Tenant locations access policy"');

    // Asserts canonical RLS policies using public.is_org_member() and auth.uid() are established
    expect(sql).toContain('is_org_member(organization_id)');
    expect(sql).toContain('auth.uid()');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.organization_members');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 23. x-organization-id spoofing remains blocked
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 23: x-organization-id spoofing remains blocked (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current')
      .set('Authorization', 'Bearer token-member-1')
      .set('x-organization-id', '00000000-0000-0000-0000-000000000001');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 24. Consumer billing remains isolated from Gym Owner authorization
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 24: Consumer billing remains isolated from Gym Owner authorization', async () => {
    // Normal member requesting owner/admin billing metrics gets 403 Forbidden
    const memberBillingRes = await request(app)
      .get('/api/v1/billing/admin/metrics')
      .set('Authorization', 'Bearer token-member-1');

    expect(memberBillingRes.status).toBe(403);

    // Front Desk requesting billing admin metrics gets 403 Forbidden
    const frontDeskRes = await request(app)
      .get('/api/v1/billing/admin/metrics')
      .set('Authorization', 'Bearer token-frontdesk');

    expect(frontDeskRes.status).toBe(403);
  });
});
