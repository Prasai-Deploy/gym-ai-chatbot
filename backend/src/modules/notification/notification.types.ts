export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms' | 'whatsapp';

export type NotificationCategory =
  | 'member'
  | 'trainer'
  | 'owner'
  | 'admin'
  | 'system'
  | 'ai_coach'
  | 'billing'
  | 'attendance'
  | 'workout'
  | 'nutrition';

export interface NotificationEvent {
  id: string;
  organizationId: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface NotificationPreferences {
  userId: string;
  enabledChannels: NotificationChannel[];
  quietHoursStart?: string; // e.g. "22:00"
  quietHoursEnd?: string;   // e.g. "07:00"
  timezone: string;
  digestFrequency: 'realtime' | 'daily' | 'weekly';
}

export interface EmailProvider {
  sendEmail(to: string, subject: string, bodyHtml: string): Promise<boolean>;
}

export interface SMSProvider {
  sendSMS(toPhone: string, message: string): Promise<boolean>;
}

export interface PushProvider {
  sendPushNotification(deviceToken: string, title: string, body: string): Promise<boolean>;
}

export interface WhatsAppProvider {
  sendWhatsAppMessage(toPhone: string, templateName: string, params: Record<string, any>): Promise<boolean>;
}

// ============================================================================
// STRIVA V2 - Phase 8I: Canonical Organization Notifications & Attention Types
// ============================================================================

export type OrgNotificationSeverity = 'info' | 'warning' | 'critical';

export type OrgNotificationType =
  | 'billing_past_due'
  | 'billing_pending_setup'
  | 'trainer_unassigned_members'
  | 'attendance_unclosed'
  | 'staff_pending_invitations'
  | 'system_no_locations'
  | string;

export interface OrgNotification {
  id: string;
  organization_id: string;
  recipient_user_id?: string | null;
  recipient_role?: string;
  type: OrgNotificationType;
  severity: OrgNotificationSeverity;
  title: string;
  message: string;
  resource_type?: string | null;
  resource_id?: string | null;
  action_path?: string | null;
  action_label?: string | null;
  is_read: boolean;
  read_at?: string | null;
  deduplication_key?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OrgAttentionItem {
  id: string;
  severity: OrgNotificationSeverity;
  title: string;
  message: string;
  actionPath?: string;
  actionLabel?: string;
  resourceType?: string;
  resourceId?: string;
  createdAt: string;
  deduplicationKey?: string;
}

export interface NotificationListQuery {
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}

