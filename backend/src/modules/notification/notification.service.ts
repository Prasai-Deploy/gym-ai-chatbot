import { NotificationRepository, notificationRepository } from './notification.repository';
import {
  OrgNotification,
  OrgAttentionItem,
  NotificationListQuery,
  OrgNotificationSeverity,
} from './notification.types';
import { NotFoundError, ForbiddenError } from '@errors/AppError';
import { logger } from '@logger/index';

export class NotificationService {
  constructor(private readonly repository: NotificationRepository = notificationRepository) {}

  /**
   * Evaluates operational events against real persisted data.
   * Persists new unread notifications using deterministic deduplication keys.
   * Returns prioritized attention items (critical -> warning -> info).
   */
  public async evaluateOperationalEvents(
    orgId: string,
    role: string = 'Organization Owner'
  ): Promise<OrgAttentionItem[]> {
    const isOwnerOrSuperAdmin = role === 'Organization Owner' || role === 'Platform Super Admin';
    const attentionItems: OrgAttentionItem[] = [];
    const today = new Date().toISOString().split('T')[0];

    // 1. EVALUATE B2B SUBSCRIPTION STATE (Restricted to Owner/SuperAdmin)
    if (isOwnerOrSuperAdmin) {
      try {
        const subscription = await this.repository.getSubscription(orgId);
        if (subscription && subscription.status === 'past_due') {
          const item = await this.repository.upsertDeduplicatedNotification({
            organization_id: orgId,
            recipient_role: 'Organization Owner',
            type: 'billing_past_due',
            severity: 'critical',
            title: 'Subscription Payment Past Due',
            message: 'Your organization subscription payment has failed. Update billing credentials to prevent service interruption.',
            action_path: '/owner/billing',
            action_label: 'Resolve Billing',
            resource_type: 'subscription',
            resource_id: subscription.id,
            deduplication_key: `org:${orgId}:billing_past_due`,
          });

          attentionItems.push({
            id: item.id || `billing-past-due-${orgId}`,
            severity: 'critical',
            title: item.title,
            message: item.message,
            actionPath: item.action_path || '/owner/billing',
            actionLabel: item.action_label || 'Resolve Billing',
            resourceType: 'subscription',
            resourceId: subscription.id,
            createdAt: item.created_at || new Date().toISOString(),
            deduplicationKey: `org:${orgId}:billing_past_due`,
          });
        } else if (!subscription || subscription.status === 'none' || subscription.status === 'pending_checkout') {
          const item = await this.repository.upsertDeduplicatedNotification({
            organization_id: orgId,
            recipient_role: 'Organization Owner',
            type: 'billing_pending_setup',
            severity: 'warning',
            title: 'Subscription Setup Required',
            message: 'Your facility does not have an active billing plan. Configure a plan to unlock multi-location and capacity features.',
            action_path: '/owner/billing',
            action_label: 'Configure Plan',
            resource_type: 'subscription',
            deduplication_key: `org:${orgId}:billing_pending_setup`,
          });

          attentionItems.push({
            id: item.id || `billing-setup-${orgId}`,
            severity: 'warning',
            title: item.title,
            message: item.message,
            actionPath: item.action_path || '/owner/billing',
            actionLabel: item.action_label || 'Configure Plan',
            resourceType: 'subscription',
            createdAt: item.created_at || new Date().toISOString(),
            deduplicationKey: `org:${orgId}:billing_pending_setup`,
          });
        }
      } catch (err: any) {
        logger.warn(`[NotificationService] Error evaluating subscription events for org ${orgId}: ${err?.message}`);
      }
    }

    // 2. EVALUATE UNCLOSED ATTENDANCE SESSIONS (> 8 hours)
    try {
      const unclosedCount = await this.repository.getUnclosedAttendanceCount(orgId);
      if (unclosedCount > 0) {
        const item = await this.repository.upsertDeduplicatedNotification({
          organization_id: orgId,
          recipient_role: 'Gym Manager',
          type: 'attendance_unclosed',
          severity: 'warning',
          title: 'Unclosed Attendance Sessions',
          message: `${unclosedCount} member check-in session(s) remain open after more than 8 hours. Verify facility checkouts.`,
          action_path: '/owner/attendance',
          action_label: 'Review Attendance',
          resource_type: 'attendance',
          deduplication_key: `org:${orgId}:attendance_unclosed:${today}`,
          metadata: { count: unclosedCount, date: today },
        });

        attentionItems.push({
          id: item.id || `attendance-unclosed-${orgId}-${today}`,
          severity: 'warning',
          title: item.title,
          message: item.message,
          actionPath: item.action_path || '/owner/attendance',
          actionLabel: item.action_label || 'Review Attendance',
          resourceType: 'attendance',
          createdAt: item.created_at || new Date().toISOString(),
          deduplicationKey: `org:${orgId}:attendance_unclosed:${today}`,
        });
      }
    } catch (err: any) {
      logger.warn(`[NotificationService] Error evaluating attendance events for org ${orgId}: ${err?.message}`);
    }

    // 3. EVALUATE UNASSIGNED ACTIVE MEMBERS (TRAINER ROSTER)
    try {
      const unassignedCount = await this.repository.getUnassignedActiveMembersCount(orgId);
      if (unassignedCount > 0) {
        const item = await this.repository.upsertDeduplicatedNotification({
          organization_id: orgId,
          recipient_role: 'Gym Manager',
          type: 'trainer_unassigned_members',
          severity: 'warning',
          title: 'Unassigned Active Members',
          message: `${unassignedCount} active member(s) have no dedicated personal trainer assigned.`,
          action_path: '/owner/trainers',
          action_label: 'Assign Trainers',
          resource_type: 'trainer',
          deduplication_key: `org:${orgId}:trainer_unassigned_members`,
          metadata: { count: unassignedCount },
        });

        attentionItems.push({
          id: item.id || `trainer-unassigned-${orgId}`,
          severity: 'warning',
          title: item.title,
          message: item.message,
          actionPath: item.action_path || '/owner/trainers',
          actionLabel: item.action_label || 'Assign Trainers',
          resourceType: 'trainer',
          createdAt: item.created_at || new Date().toISOString(),
          deduplicationKey: `org:${orgId}:trainer_unassigned_members`,
        });
      }
    } catch (err: any) {
      logger.warn(`[NotificationService] Error evaluating trainer assignment events for org ${orgId}: ${err?.message}`);
    }

    // 4. EVALUATE PENDING STAFF INVITATIONS
    try {
      const pendingInvitations = await this.repository.getPendingStaffInvitationsCount(orgId);
      if (pendingInvitations > 0) {
        const item = await this.repository.upsertDeduplicatedNotification({
          organization_id: orgId,
          recipient_role: 'Gym Manager',
          type: 'staff_pending_invitations',
          severity: 'info',
          title: 'Pending Staff Invitations',
          message: `${pendingInvitations} staff invitation(s) are awaiting onboarding acceptance.`,
          action_path: '/owner/members',
          action_label: 'View Members',
          resource_type: 'staff',
          deduplication_key: `org:${orgId}:staff_pending_invitations`,
          metadata: { count: pendingInvitations },
        });

        attentionItems.push({
          id: item.id || `staff-invitations-${orgId}`,
          severity: 'info',
          title: item.title,
          message: item.message,
          actionPath: item.action_path || '/owner/members',
          actionLabel: item.action_label || 'View Members',
          resourceType: 'staff',
          createdAt: item.created_at || new Date().toISOString(),
          deduplicationKey: `org:${orgId}:staff_pending_invitations`,
        });
      }
    } catch (err: any) {
      logger.warn(`[NotificationService] Error evaluating staff invitations for org ${orgId}: ${err?.message}`);
    }

    // 5. EVALUATE SYSTEM SETUP (FACILITY LOCATIONS)
    try {
      const locationCount = await this.repository.getLocationCount(orgId);
      if (locationCount === 0) {
        const item = await this.repository.upsertDeduplicatedNotification({
          organization_id: orgId,
          recipient_role: 'Organization Owner',
          type: 'system_no_locations',
          severity: 'warning',
          title: 'No Facility Locations Configured',
          message: 'Add your primary club branch location to activate location-based access control and member check-ins.',
          action_path: undefined,
          action_label: undefined,
          resource_type: 'location',
          deduplication_key: `org:${orgId}:system_no_locations`,
        });

        attentionItems.push({
          id: item.id || `system-no-locations-${orgId}`,
          severity: 'warning',
          title: item.title,
          message: item.message,
          actionPath: undefined,
          actionLabel: undefined,
          resourceType: 'location',
          createdAt: item.created_at || new Date().toISOString(),
          deduplicationKey: `org:${orgId}:system_no_locations`,
        });
      }
    } catch (err: any) {
      logger.warn(`[NotificationService] Error evaluating facility locations for org ${orgId}: ${err?.message}`);
    }

    // Sort items by priority: Critical (1) -> Warning (2) -> Info (3)
    const severityRank: Record<OrgNotificationSeverity, number> = {
      critical: 1,
      warning: 2,
      info: 3,
    };

    return attentionItems.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  }

  /**
   * Get attention items summary for the owner dashboard
   */
  public async getAttentionSummary(
    orgId: string,
    _userId: string,
    role: string
  ): Promise<{ attentionItems: OrgAttentionItem[] }> {
    const items = await this.evaluateOperationalEvents(orgId, role);
    return { attentionItems: items };
  }

  /**
   * List authorized notifications for tenant and recipient
   */
  public async listNotifications(
    orgId: string,
    userId: string,
    role: string,
    query: NotificationListQuery = {}
  ): Promise<{ notifications: OrgNotification[]; total: number; unreadCount: number }> {
    return this.repository.listNotifications(orgId, userId, role, query);
  }

  /**
   * Get unread notification count
   */
  public async getUnreadCount(orgId: string, userId: string, role: string): Promise<{ unreadCount: number }> {
    const count = await this.repository.getUnreadCount(orgId, userId, role);
    return { unreadCount: count };
  }

  /**
   * Mark a single notification as read
   */
  public async markAsRead(
    orgId: string,
    notificationId: string,
    userId: string,
    role: string
  ): Promise<OrgNotification> {
    const existing = await this.repository.getNotificationById(orgId, notificationId);
    if (!existing) {
      throw new NotFoundError('Notification not found');
    }

    // RBAC: Non-owners cannot interact with billing notifications
    const isOwnerOrSuperAdmin = role === 'Organization Owner' || role === 'Platform Super Admin';
    if (existing.type.startsWith('billing_') && !isOwnerOrSuperAdmin) {
      throw new ForbiddenError('Access denied');
    }

    const updated = await this.repository.markAsRead(orgId, notificationId, userId);
    if (!updated) {
      throw new NotFoundError('Notification not found');
    }

    return updated;
  }

  /**
   * Mark all unread notifications as read
   */
  public async markAllAsRead(
    orgId: string,
    userId: string,
    role: string
  ): Promise<{ count: number }> {
    const count = await this.repository.markAllAsRead(orgId, userId, role);
    return { count };
  }
}

export const notificationService = new NotificationService();
