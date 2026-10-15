import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '@database/supabase';
import { OrgNotification, NotificationListQuery } from './notification.types';
import { DatabaseError } from '@errors/AppError';

export class NotificationRepository {
  constructor(private readonly supabase: SupabaseClient = defaultSupabase) {}

  /**
   * List authorized notifications for tenant and recipient role
   * Evaluates recipient-specific read state from organization_notification_reads
   */
  public async listNotifications(
    orgId: string,
    userId: string,
    role: string,
    query: NotificationListQuery = {}
  ): Promise<{ notifications: OrgNotification[]; total: number; unreadCount: number }> {
    const isOwnerOrSuperAdmin = role === 'Organization Owner' || role === 'Platform Super Admin';
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    // 1. Fetch authorized notifications for this tenant
    let dbQuery = this.supabase
      .from('organization_notifications')
      .select('*')
      .eq('organization_id', orgId);

    if (!isOwnerOrSuperAdmin) {
      // Non-owners can never see billing notifications
      dbQuery = dbQuery.not('type', 'ilike', 'billing_%');
    }

    dbQuery = dbQuery.order('created_at', { ascending: false });

    const { data: rawNotifications, error: notifError } = await dbQuery;

    if (notifError) {
      throw new DatabaseError(`Failed to list organization notifications: ${notifError.message}`);
    }

    const allNotifs: OrgNotification[] = (rawNotifications as OrgNotification[]) || [];

    // 2. Fetch user's individual read records
    const { data: readRecords } = await this.supabase
      .from('organization_notification_reads')
      .select('notification_id, read_at')
      .eq('organization_id', orgId)
      .eq('user_id', userId);

    const userReadMap = new Map<string, string>();
    if (readRecords) {
      readRecords.forEach((r: any) => userReadMap.set(r.notification_id, r.read_at));
    }

    // 3. Map notifications with recipient-specific read status
    const mapped = allNotifs.map((n) => {
      const isUserRead = userReadMap.has(n.id) || (n.recipient_user_id === userId && n.is_read);
      const userReadAt = userReadMap.get(n.id) || (isUserRead ? n.read_at : null);
      return {
        ...n,
        is_read: isUserRead,
        read_at: userReadAt,
      };
    });

    // 4. Calculate unread count specifically for this recipient user
    const unreadCount = mapped.filter((n) => !n.is_read).length;

    // 5. Filter for unread_only if requested
    const filtered = query.unread_only ? mapped.filter((n) => !n.is_read) : mapped;
    const total = filtered.length;

    // 6. Apply pagination
    const paginated = filtered.slice(offset, offset + limit);

    return {
      notifications: paginated,
      total,
      unreadCount,
    };
  }

  /**
   * Get total unread notifications count specifically for this recipient user
   */
  public async getUnreadCount(orgId: string, userId: string, role: string): Promise<number> {
    const isOwnerOrSuperAdmin = role === 'Organization Owner' || role === 'Platform Super Admin';

    let query = this.supabase
      .from('organization_notifications')
      .select('id, recipient_user_id, is_read')
      .eq('organization_id', orgId);

    if (!isOwnerOrSuperAdmin) {
      query = query.not('type', 'ilike', 'billing_%');
    }

    const { data: notifications, error } = await query;
    if (error) {
      throw new DatabaseError(`Failed to get unread notifications count: ${error.message}`);
    }

    const { data: readRecords } = await this.supabase
      .from('organization_notification_reads')
      .select('notification_id')
      .eq('organization_id', orgId)
      .eq('user_id', userId);

    const readSet = new Set((readRecords || []).map((r: any) => r.notification_id));

    const unread = (notifications || []).filter((n: any) => {
      if (readSet.has(n.id)) return false;
      if (n.recipient_user_id === userId && n.is_read) return false;
      return true;
    });

    return unread.length;
  }

  /**
   * Retrieve notification by ID within organization tenant boundary
   */
  public async getNotificationById(orgId: string, id: string): Promise<OrgNotification | null> {
    const { data, error } = await this.supabase
      .from('organization_notifications')
      .select('*')
      .eq('organization_id', orgId)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(`Failed to get organization notification: ${error.message}`);
    }

    return data as OrgNotification | null;
  }

  /**
   * Mark a single notification as read specifically for this recipient user
   */
  public async markAsRead(orgId: string, id: string, userId: string): Promise<OrgNotification | null> {
    const notification = await this.getNotificationById(orgId, id);
    if (!notification) {
      return null;
    }

    const nowIso = new Date().toISOString();

    // 1. Record recipient-specific read event in normalized reads table
    const { error: readErr } = await this.supabase
      .from('organization_notification_reads')
      .insert({
        notification_id: id,
        organization_id: orgId,
        user_id: userId,
        read_at: nowIso,
      });

    if (readErr && readErr.code !== '23505') {
      // Ignore unique violation if already read
      throw new DatabaseError(`Failed to record notification read state: ${readErr.message}`);
    }

    // 2. If notification was targeted to this specific user, also update the main row
    if (notification.recipient_user_id === userId) {
      await this.supabase
        .from('organization_notifications')
        .update({
          is_read: true,
          read_at: nowIso,
          updated_at: nowIso,
        })
        .eq('organization_id', orgId)
        .eq('id', id);
    }

    return {
      ...notification,
      is_read: true,
      read_at: nowIso,
      updated_at: nowIso,
    };
  }

  /**
   * Mark all unread notifications as read specifically for this recipient user
   */
  public async markAllAsRead(orgId: string, userId: string, role: string): Promise<number> {
    const isOwnerOrSuperAdmin = role === 'Organization Owner' || role === 'Platform Super Admin';
    const nowIso = new Date().toISOString();

    // 1. Find all authorized notifications for this tenant
    let query = this.supabase
      .from('organization_notifications')
      .select('id')
      .eq('organization_id', orgId);

    if (!isOwnerOrSuperAdmin) {
      query = query.not('type', 'ilike', 'billing_%');
    }

    const { data: allNotifs, error: queryErr } = await query;
    if (queryErr) {
      throw new DatabaseError(`Failed to fetch notifications to mark read: ${queryErr.message}`);
    }

    if (!allNotifs || allNotifs.length === 0) {
      return 0;
    }

    // 2. Find which notifications this user has already read
    const { data: readRecords } = await this.supabase
      .from('organization_notification_reads')
      .select('notification_id')
      .eq('organization_id', orgId)
      .eq('user_id', userId);

    const readSet = new Set((readRecords || []).map((r: any) => r.notification_id));
    const unreadIds = allNotifs.filter((n: any) => !readSet.has(n.id)).map((n: any) => n.id);

    if (unreadIds.length === 0) {
      return 0;
    }

    // 3. Insert read records for all unread notifications
    const inserts = unreadIds.map((notifId: string) => ({
      notification_id: notifId,
      organization_id: orgId,
      user_id: userId,
      read_at: nowIso,
    }));

    const { error: insertErr } = await this.supabase
      .from('organization_notification_reads')
      .insert(inserts);

    if (insertErr) {
      throw new DatabaseError(`Failed to mark all notifications as read: ${insertErr.message}`);
    }

    return unreadIds.length;
  }


  /**
   * Deterministically insert or deduplicate an active notification
   * Prevents repeated evaluation from creating duplicate unread records
   */
  public async upsertDeduplicatedNotification(
    item: Omit<OrgNotification, 'id' | 'created_at' | 'updated_at' | 'is_read' | 'read_at'>
  ): Promise<OrgNotification> {
    if (item.deduplication_key) {
      // Check if unread notification already exists with this deduplication_key
      const { data: existing, error: selectErr } = await this.supabase
        .from('organization_notifications')
        .select('*')
        .eq('organization_id', item.organization_id)
        .eq('deduplication_key', item.deduplication_key)
        .eq('is_read', false)
        .maybeSingle();

      if (!selectErr && existing) {
        return existing as OrgNotification;
      }
    }

    const nowIso = new Date().toISOString();
    const payload = {
      organization_id: item.organization_id,
      recipient_user_id: item.recipient_user_id || null,
      recipient_role: item.recipient_role || 'Organization Owner',
      type: item.type,
      severity: item.severity,
      title: item.title,
      message: item.message,
      resource_type: item.resource_type || null,
      resource_id: item.resource_id || null,
      action_path: item.action_path || null,
      action_label: item.action_label || null,
      is_read: false,
      deduplication_key: item.deduplication_key || null,
      metadata: item.metadata || {},
      created_at: nowIso,
      updated_at: nowIso,
    };

    const { data, error } = await this.supabase
      .from('organization_notifications')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      // If concurrent insert hit partial unique index uq_org_notifications_active_dedup
      if (item.deduplication_key && (error.code === '23505' || error.message?.includes('duplicate key'))) {
        const { data: conflictRow } = await this.supabase
          .from('organization_notifications')
          .select('*')
          .eq('organization_id', item.organization_id)
          .eq('deduplication_key', item.deduplication_key)
          .eq('is_read', false)
          .maybeSingle();

        if (conflictRow) return conflictRow as OrgNotification;
      }
      throw new DatabaseError(`Failed to persist organization notification: ${error.message}`);
    }

    return data as OrgNotification;
  }

  // ============================================================================
  // PERSISTED DATA QUERY METHODS FOR EVALUATION ENGINE
  // ============================================================================

  /**
   * Fetch current B2B subscription for tenant
   */
  public async getSubscription(orgId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('organization_subscriptions')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error) {
      return null;
    }
    return data;
  }

  /**
   * Count active enrolled members without active trainer assignment
   */
  public async getUnassignedActiveMembersCount(orgId: string): Promise<number> {
    const { data: activeMembers, error: membersError } = await this.supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', orgId)
      .eq('role', 'Member')
      .eq('status', 'active');

    if (membersError || !activeMembers || activeMembers.length === 0) {
      return 0;
    }

    const { data: assignments, error: assignError } = await this.supabase
      .from('trainer_member_assignments')
      .select('member_user_id')
      .eq('organization_id', orgId)
      .eq('status', 'active');

    if (assignError) {
      return 0;
    }

    const assignedIds = new Set((assignments || []).map((a: any) => a.member_user_id));
    const unassignedCount = activeMembers.filter((m: any) => !assignedIds.has(m.user_id)).length;
    return unassignedCount;
  }

  /**
   * Count unclosed attendance logs where check-in was > 8 hours ago and check_out_time is null
   */
  public async getUnclosedAttendanceCount(orgId: string): Promise<number> {
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();

    const { count, error } = await this.supabase
      .from('attendance_logs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .is('check_out_time', null)
      .lt('check_in_time', eightHoursAgo);

    if (error) {
      return 0;
    }
    return count ?? 0;
  }

  /**
   * Count pending staff invitations not yet expired
   */
  public async getPendingStaffInvitationsCount(orgId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('organization_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    if (error) {
      return 0;
    }
    return count ?? 0;
  }

  /**
   * Count configured facility locations for tenant
   */
  public async getLocationCount(orgId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('organization_locations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId);

    if (error) {
      return 0;
    }
    return count ?? 0;
  }
}

export const notificationRepository = new NotificationRepository();
