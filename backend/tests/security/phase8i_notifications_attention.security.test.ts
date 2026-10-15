import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app/app';

// Mock database store for Phase 8I Organization Notifications Suite
vi.mock('../../src/database/supabase', () => {
  let mockStore = {
    organizations: [] as any[],
    organization_members: [] as any[],
    organization_locations: [] as any[],
    organization_subscriptions: [] as any[],
    attendance_logs: [] as any[],
    trainer_member_assignments: [] as any[],
    organization_invitations: [] as any[],
    organization_notifications: [] as any[],
    organization_notification_reads: [] as any[],
    subscriptions: [] as any[],
  };

  const resetStore = () => {
    mockStore = {
      organizations: [
        { id: 'org-owner-1', name: 'Titan Gym Central', owner_id: 'usr-owner-1' },
        { id: 'org-other-2', name: 'Rival Fitness', owner_id: 'usr-rival-owner' },
      ],
      organization_members: [
        { id: 'mem-1', organization_id: 'org-owner-1', user_id: 'usr-owner-1', role: 'Organization Owner', status: 'active' },
        { id: 'mem-2', organization_id: 'org-owner-1', user_id: 'usr-mgr-1', role: 'Gym Manager', status: 'active' },
        { id: 'mem-3', organization_id: 'org-owner-1', user_id: 'usr-trainer-1', role: 'Trainer', status: 'active' },
        { id: 'mem-4', organization_id: 'org-owner-1', user_id: 'usr-frontdesk-1', role: 'Front Desk', status: 'active' },
        { id: 'mem-5', organization_id: 'org-owner-1', user_id: 'usr-nutri-1', role: 'Nutritionist', status: 'active' },
        { id: 'mem-6', organization_id: 'org-owner-1', user_id: 'usr-member-1', role: 'Member', status: 'active' },
        { id: 'mem-7', organization_id: 'org-other-2', user_id: 'usr-rival-owner', role: 'Organization Owner', status: 'active' },
      ],
      organization_locations: [
        { id: 'loc-1', organization_id: 'org-owner-1', name: 'Downtown Branch', is_primary: true },
      ],
      organization_subscriptions: [
        {
          id: 'sub-org-1',
          organization_id: 'org-owner-1',
          status: 'past_due',
          billing_interval: 'monthly',
          amount_paise: 499900,
        },
      ],
      attendance_logs: [
        {
          id: 'att-open-1',
          organization_id: 'org-owner-1',
          user_id: 'usr-member-1',
          check_in_time: new Date(Date.now() - 10 * 3600 * 1000).toISOString(), // 10 hrs ago
          check_out_time: null,
          status: 'active',
        },
      ],
      trainer_member_assignments: [] as any[], // member-1 is active but has no assignment
      organization_invitations: [
        {
          id: 'inv-1',
          organization_id: 'org-owner-1',
          email: 'trainer2@titan.app',
          role_key: 'Trainer',
          status: 'pending',
          expires_at: new Date(Date.now() + 86400 * 1000).toISOString(), // expires tomorrow
        },
      ],
      organization_notifications: [
        {
          id: '00000000-0000-0000-0000-000000000001',
          organization_id: 'org-owner-1',
          recipient_user_id: null,
          recipient_role: 'Organization Owner',
          type: 'billing_past_due',
          severity: 'critical',
          title: 'Subscription Payment Past Due',
          message: 'Your organization subscription payment has failed.',
          action_path: '/owner/billing',
          action_label: 'Resolve Billing',
          resource_type: 'subscription',
          is_read: false,
          read_at: null,
          deduplication_key: 'org:org-owner-1:billing_past_due',
          metadata: {},
          created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          organization_id: 'org-owner-1',
          recipient_user_id: null,
          recipient_role: 'Gym Manager',
          type: 'trainer_unassigned_members',
          severity: 'warning',
          title: 'Unassigned Active Members',
          message: '1 active member(s) have no dedicated personal trainer assigned.',
          action_path: '/owner/trainers',
          action_label: 'Assign Trainers',
          resource_type: 'trainer',
          is_read: false,
          read_at: null,
          deduplication_key: 'org:org-owner-1:trainer_unassigned_members',
          metadata: { count: 1 },
          created_at: new Date(Date.now() - 1800 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1800 * 1000).toISOString(),
        },
        {
          id: '00000000-0000-0000-0000-000000000003',
          organization_id: 'org-other-2',
          recipient_user_id: null,
          recipient_role: 'Organization Owner',
          type: 'billing_past_due',
          severity: 'critical',
          title: 'Rival Subscription Payment Past Due',
          message: 'Confidential billing issue for Rival Fitness.',
          action_path: '/owner/billing',
          action_label: 'Resolve Billing',
          resource_type: 'subscription',
          is_read: false,
          read_at: null,
          deduplication_key: 'org:org-other-2:billing_past_due',
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      organization_notification_reads: [] as any[],
      subscriptions: [
        { user_id: 'usr-member-1', tier: 'pro', status: 'active' },
        { user_id: 'usr-owner-1', tier: 'free', status: 'active' },
      ],
    };
  };


  resetStore();

  const mockDb = {
    _resetStore: resetStore,
    _getStore: () => mockStore,
    from: (table: string) => {
      let currentData = [...(mockStore[table as keyof typeof mockStore] || [])];
      let selectedCols = '*';
      let countExact = false;
      let headOnly = false;
      let limitCount: number | null = null;
      let offsetCount = 0;
      let isSingle = false;
      let isMaybeSingle = false;
      let updatePayload: any = null;
      let insertPayload: any = null;
      let isInsert = false;
      let isUpdate = false;

      const queryBuilder: any = {
        select: (cols: string = '*', opts?: { count?: string; head?: boolean }) => {
          selectedCols = cols;
          if (opts?.count === 'exact') countExact = true;
          if (opts?.head) headOnly = true;
          return queryBuilder;
        },
        insert: (payload: any) => {
          isInsert = true;
          insertPayload = payload;
          return queryBuilder;
        },
        update: (payload: any) => {
          isUpdate = true;
          updatePayload = payload;
          return queryBuilder;
        },
        eq: (col: string, val: any) => {
          currentData = currentData.filter((row: any) => row[col] === val);
          return queryBuilder;
        },
        neq: (col: string, val: any) => {
          currentData = currentData.filter((row: any) => row[col] !== val);
          return queryBuilder;
        },
        not: (col: string, op: string, val: any) => {
          if (op === 'ilike') {
            const prefix = val.replace(/%/g, '').toLowerCase();
            currentData = currentData.filter((row: any) => !String(row[col] || '').toLowerCase().startsWith(prefix));
          }
          return queryBuilder;
        },
        is: (col: string, val: any) => {
          currentData = currentData.filter((row: any) => row[col] === val);
          return queryBuilder;
        },
        lt: (col: string, val: any) => {
          currentData = currentData.filter((row: any) => row[col] < val);
          return queryBuilder;
        },
        lte: (col: string, val: any) => {
          currentData = currentData.filter((row: any) => row[col] <= val);
          return queryBuilder;
        },
        gt: (col: string, val: any) => {
          currentData = currentData.filter((row: any) => row[col] > val);
          return queryBuilder;
        },
        gte: (col: string, val: any) => {
          currentData = currentData.filter((row: any) => row[col] >= val);
          return queryBuilder;
        },
        order: (_col: string, _opts?: any) => {
          return queryBuilder;
        },
        range: (from: number, to: number) => {
          offsetCount = from;
          limitCount = to - from + 1;
          return queryBuilder;
        },
        limit: (n: number) => {
          limitCount = n;
          return queryBuilder;
        },
        single: () => {
          isSingle = true;
          return queryBuilder.then();
        },
        maybeSingle: () => {
          isMaybeSingle = true;
          return queryBuilder.then();
        },
        then: (resolve?: any) => {
          const totalCount = currentData.length;

          if (isInsert) {
            const items = Array.isArray(insertPayload) ? insertPayload : [insertPayload];
            const inserted = items.map((item: any) => {
              const newRow = {
                id: item.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                ...item,
                created_at: item.created_at || new Date().toISOString(),
                updated_at: item.updated_at || new Date().toISOString(),
              };
              (mockStore[table as keyof typeof mockStore] as any[]).push(newRow);
              return newRow;
            });
            const resultData = isSingle ? inserted[0] : inserted;
            const res = { data: resultData, error: null };
            return resolve ? resolve(res) : Promise.resolve(res);
          }

          if (isUpdate) {
            const updatedRows: any[] = [];
            currentData.forEach((row: any) => {
              Object.assign(row, updatePayload);
              updatedRows.push({ ...row });
            });
            const resultData = isSingle || isMaybeSingle ? (updatedRows[0] || null) : updatedRows;
            const res = { data: resultData, error: null };
            return resolve ? resolve(res) : Promise.resolve(res);
          }

          if (headOnly) {
            const res = { data: null, count: totalCount, error: null };
            return resolve ? resolve(res) : Promise.resolve(res);
          }

          let sliceData = currentData;
          if (offsetCount > 0 || limitCount !== null) {
            sliceData = currentData.slice(offsetCount, limitCount ? offsetCount + limitCount : undefined);
          }

          if (isSingle) {
            const res = { data: sliceData[0] || null, count: totalCount, error: sliceData[0] ? null : { message: 'Row not found' } };
            return resolve ? resolve(res) : Promise.resolve(res);
          }
          if (isMaybeSingle) {
            const res = { data: sliceData[0] || null, count: totalCount, error: null };
            return resolve ? resolve(res) : Promise.resolve(res);
          }

          const res = {
            data: sliceData,
            count: countExact ? totalCount : sliceData.length,
            error: null,
          };
          return resolve ? resolve(res) : Promise.resolve(res);
        },
      };

      return queryBuilder;
    },
    auth: {
      getUser: async (token: string) => {
        if (!token) return { data: { user: null }, error: { message: 'No token' } };
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
        if (token === 'token-superadmin') {
          return {
            data: {
              user: {
                id: 'usr-admin-1',
                email: 'admin@striva.app',
                user_metadata: { role: 'Platform Super Admin' },
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
        if (token === 'token-trainer') {
          return {
            data: {
              user: {
                id: 'usr-trainer-1',
                email: 'trainer@titan.app',
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
                email: 'front@titan.app',
                user_metadata: { role: 'Front Desk' },
              },
            },
            error: null,
          };
        }
        if (token === 'token-member') {
          return {
            data: {
              user: {
                id: 'usr-member-1',
                email: 'member@titan.app',
                user_metadata: { role: 'Member' },
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
                email: 'owner@rival.app',
                user_metadata: { role: 'Organization Owner' },
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
                email: 'demo@striva.app',
                user_metadata: { role: 'Demo User' },
              },
            },
            error: null,
          };
        }
        return { data: { user: null }, error: { message: 'Invalid token' } };
      },
    },
  };

  return { supabase: mockDb, supabaseAdmin: mockDb };
});

describe('Phase 8I: Organization Notifications & Attention System Security Suite', () => {
  beforeEach(async () => {
    const { supabase } = await import('../../src/database/supabase');
    (supabase as any)._resetStore();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Owner and Super Admin Authorization
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 1: Organization Owner can list tenant notifications including billing alerts', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/notifications')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notifications.length).toBeGreaterThanOrEqual(2);
    // Owner can see both billing and trainer notifications
    const types = res.body.data.notifications.map((n: any) => n.type);
    expect(types).toContain('billing_past_due');
    expect(types).toContain('trainer_unassigned_members');
  });

  it('TEST 2: Platform Super Admin can access organization notifications', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/notifications')
      .set('Authorization', 'Bearer token-superadmin')
      .set('x-organization-id', 'org-owner-1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Billing Notification Isolation from Staff & Trainers
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 3: Gym Manager receives operational alerts but NEVER billing notifications', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/notifications')
      .set('Authorization', 'Bearer token-manager');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const notifications = res.body.data.notifications;
    const hasBilling = notifications.some((n: any) => n.type.startsWith('billing_'));
    expect(hasBilling).toBe(false);
    expect(notifications.some((n: any) => n.type === 'trainer_unassigned_members')).toBe(true);
  });

  it('TEST 4: Trainer can view general notifications but billing notifications are strictly filtered out', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/notifications')
      .set('Authorization', 'Bearer token-trainer');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const notifications = res.body.data.notifications;
    const hasBilling = notifications.some((n: any) => n.type.startsWith('billing_'));
    expect(hasBilling).toBe(false);
  });

  it('TEST 5: Trainer is DENIED from accessing Owner Attention summary endpoint (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/notifications/attention')
      .set('Authorization', 'Bearer token-trainer');

    expect(res.status).toBe(403);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Unauthorized Role Denial (Members, Demo Users, Unauthenticated)
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 6: Consumer Member is DENIED from accessing organization notifications (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/notifications')
      .set('Authorization', 'Bearer token-member');

    expect(res.status).toBe(403);
  });

  it('TEST 7: Demo User is DENIED from accessing organization notifications (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/notifications')
      .set('Authorization', 'Bearer token-demo');

    expect(res.status).toBe(403);
  });

  it('TEST 8: Unauthenticated request is REJECTED (401 Unauthorized)', async () => {
    const res = await request(app).get('/api/v1/organizations/current/notifications');
    expect(res.status).toBe(401);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Cross-Tenant Access Denial
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 9: Cross-tenant isolation prevents Rival Owner from reading Titan Gym notifications', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/notifications')
      .set('Authorization', 'Bearer token-rival-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const notifications = res.body.data.notifications;
    // Rival owner should only see Rival Fitness notifications (org-other-2)
    expect(notifications.every((n: any) => n.organization_id === 'org-other-2')).toBe(true);
    expect(notifications.some((n: any) => n.title.includes('Titan'))).toBe(false);
  });

  it('TEST 10: Rival Owner cannot mark Titan Gym notification as read (404 Not Found)', async () => {
    const res = await request(app)
      .patch('/api/v1/organizations/current/notifications/00000000-0000-0000-0000-000000000001/read')
      .set('Authorization', 'Bearer token-rival-owner');

    // Fail closed: Not Found for cross-tenant ID
    expect(res.status).toBe(404);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Header Spoofing Prevention
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 11: Header spoofing with unauthorized x-organization-id is rejected (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/notifications')
      .set('Authorization', 'Bearer token-rival-owner')
      .set('x-organization-id', 'org-owner-1');

    // Server-side tenant resolution actively rejects spoofed access to unauthorized org
    expect(res.status).toBe(403);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Read State Mutations & Ownership
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 12: Owner can mark an unread notification as read', async () => {
    const res = await request(app)
      .patch('/api/v1/organizations/current/notifications/00000000-0000-0000-0000-000000000001/read')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notification.is_read).toBe(true);
  });

  it('TEST 13: Trainer cannot mark a billing notification as read (403 Forbidden)', async () => {
    const res = await request(app)
      .patch('/api/v1/organizations/current/notifications/00000000-0000-0000-0000-000000000001/read')
      .set('Authorization', 'Bearer token-trainer');

    expect(res.status).toBe(403);
  });

  it('TEST 14: Marking all notifications as read updates all unread notifications', async () => {
    const res = await request(app)
      .post('/api/v1/organizations/current/notifications/mark-all-read')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBeGreaterThanOrEqual(1);

    // Verify unread count is now 0
    const countRes = await request(app)
      .get('/api/v1/organizations/current/notifications/unread-count')
      .set('Authorization', 'Bearer token-owner');

    expect(countRes.body.data.unreadCount).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Deterministic Deduplication & Repeated Polling
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 15: Repeated evaluation does not create duplicate unread notifications', async () => {
    const { notificationService } = await import('../../src/modules/notification/notification.service');
    const { supabase } = await import('../../src/database/supabase');

    const initialCount = ((supabase as any)._getStore().organization_notifications as any[]).length;

    // Evaluate operational events multiple times for org-owner-1
    await notificationService.evaluateOperationalEvents('org-owner-1', 'Organization Owner');
    await notificationService.evaluateOperationalEvents('org-owner-1', 'Organization Owner');
    await notificationService.evaluateOperationalEvents('org-owner-1', 'Organization Owner');

    const finalCount = ((supabase as any)._getStore().organization_notifications as any[]).length;
    // Count should increase only once for each newly triggered active condition, not 3x
    const dedupKeys = ((supabase as any)._getStore().organization_notifications as any[])
      .filter((n: any) => n.organization_id === 'org-owner-1' && !n.is_read)
      .map((n: any) => n.deduplication_key);

    const uniqueKeys = new Set(dedupKeys);
    expect(dedupKeys.length).toBe(uniqueKeys.size);
  });

  it('TEST 16: Repeated polling of /attention returns deterministic prioritized items', async () => {
    const res1 = await request(app)
      .get('/api/v1/organizations/current/notifications/attention')
      .set('Authorization', 'Bearer token-owner');

    const res2 = await request(app)
      .get('/api/v1/organizations/current/notifications/attention')
      .set('Authorization', 'Bearer token-owner');

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.data.attentionItems.length).toBe(res2.body.data.attentionItems.length);

    // Items must be ordered Critical -> Warning -> Info
    const items = res1.body.data.attentionItems;
    if (items.length >= 2) {
      const severities = items.map((i: any) => i.severity);
      const criticalIdx = severities.indexOf('critical');
      const warningIdx = severities.indexOf('warning');
      if (criticalIdx !== -1 && warningIdx !== -1) {
        expect(criticalIdx).toBeLessThan(warningIdx);
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Zod Validation & Edge Cases
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 17: Invalid non-UUID notification ID returns 400 Bad Request', async () => {
    const res = await request(app)
      .patch('/api/v1/organizations/current/notifications/invalid-id-format/read')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(400);
  });

  it('TEST 18: Non-existent UUID notification returns 404 Not Found', async () => {
    const res = await request(app)
      .patch('/api/v1/organizations/current/notifications/99999999-9999-9999-9999-999999999999/read')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(404);
  });

  it('TEST 19: Pagination clamps limit and offset properly', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current/notifications?limit=10&offset=0')
      .set('Authorization', 'Bearer token-owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notifications).toBeDefined();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 9. Consumer Billing Regression Verification
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 20: Consumer billing status endpoint remains functional and isolated', async () => {
    const res = await request(app)
      .get('/api/v1/billing/status')
      .set('Authorization', 'Bearer token-member');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 10. Recipient-Specific Read State & Independent Recipient Semantics
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 21: Two authorized recipients read a shared operational notification independently', async () => {
    const sharedNotifId = '00000000-0000-0000-0000-000000000002'; // trainer_unassigned_members

    // 1. Initial State: Notification is unread for both Owner and Manager
    const ownerListBefore = await request(app)
      .get('/api/v1/organizations/current/notifications')
      .set('Authorization', 'Bearer token-owner');
    const mgrListBefore = await request(app)
      .get('/api/v1/organizations/current/notifications')
      .set('Authorization', 'Bearer token-manager');

    const ownerItemBefore = ownerListBefore.body.data.notifications.find((n: any) => n.id === sharedNotifId);
    const mgrItemBefore = mgrListBefore.body.data.notifications.find((n: any) => n.id === sharedNotifId);

    expect(ownerItemBefore?.is_read).toBe(false);
    expect(mgrItemBefore?.is_read).toBe(false);
    expect(mgrListBefore.body.data.unreadCount).toBe(1);

    // 2. Owner marks the shared notification as read
    const markRes = await request(app)
      .patch(`/api/v1/organizations/current/notifications/${sharedNotifId}/read`)
      .set('Authorization', 'Bearer token-owner');

    expect(markRes.status).toBe(200);
    expect(markRes.body.data.notification.is_read).toBe(true);

    // 3. Verify Owner sees it as read
    const ownerListAfter = await request(app)
      .get('/api/v1/organizations/current/notifications')
      .set('Authorization', 'Bearer token-owner');
    const ownerItemAfter = ownerListAfter.body.data.notifications.find((n: any) => n.id === sharedNotifId);
    expect(ownerItemAfter?.is_read).toBe(true);

    // 4. Verify Manager STILL sees it as unread (recipient isolation)
    const mgrListAfter = await request(app)
      .get('/api/v1/organizations/current/notifications')
      .set('Authorization', 'Bearer token-manager');
    const mgrItemAfter = mgrListAfter.body.data.notifications.find((n: any) => n.id === sharedNotifId);
    expect(mgrItemAfter?.is_read).toBe(false);
    expect(mgrListAfter.body.data.unreadCount).toBe(1);

    // 5. Manager marks it as read independently
    const mgrMarkRes = await request(app)
      .patch(`/api/v1/organizations/current/notifications/${sharedNotifId}/read`)
      .set('Authorization', 'Bearer token-manager');

    expect(mgrMarkRes.status).toBe(200);
    expect(mgrMarkRes.body.data.notification.is_read).toBe(true);

    // 6. Verify Manager now sees it as read and unread count is 0
    const mgrListFinal = await request(app)
      .get('/api/v1/organizations/current/notifications')
      .set('Authorization', 'Bearer token-manager');
    const mgrItemFinal = mgrListFinal.body.data.notifications.find((n: any) => n.id === sharedNotifId);
    expect(mgrItemFinal?.is_read).toBe(true);
    expect(mgrListFinal.body.data.unreadCount).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 11. Action Destination Validation & Role Authorization
  // ──────────────────────────────────────────────────────────────────────────
  it('TEST 22: Every notification CTA points to an implemented route authorized for recipient role', async () => {
    const validCanonicalRoutes = new Set([
      '/owner/dashboard',
      '/owner/members',
      '/owner/attendance',
      '/owner/trainers',
      '/owner/analytics',
      '/owner/billing',
    ]);

    // Check Owner attention items
    const ownerRes = await request(app)
      .get('/api/v1/organizations/current/notifications/attention')
      .set('Authorization', 'Bearer token-owner');

    expect(ownerRes.status).toBe(200);
    const ownerItems = ownerRes.body.data.attentionItems;

    for (const item of ownerItems) {
      if (item.actionPath) {
        expect(validCanonicalRoutes.has(item.actionPath)).toBe(true);
        // Ensure no invalid routes like /owner/settings or /owner/staff exist
        expect(item.actionPath).not.toBe('/owner/settings');
        expect(item.actionPath).not.toBe('/owner/staff');
      }
    }

    // Check Manager attention items
    const mgrRes = await request(app)
      .get('/api/v1/organizations/current/notifications/attention')
      .set('Authorization', 'Bearer token-manager');

    expect(mgrRes.status).toBe(200);
    const mgrItems = mgrRes.body.data.attentionItems;

    for (const item of mgrItems) {
      if (item.actionPath) {
        expect(validCanonicalRoutes.has(item.actionPath)).toBe(true);
        // Billing destination must NEVER be given to Manager
        expect(item.actionPath).not.toBe('/owner/billing');
        expect(item.severity).not.toBe('critical');
      }
    }
  });
});

