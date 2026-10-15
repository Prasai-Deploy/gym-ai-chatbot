import { httpClient } from './httpClient';

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface OrgNotificationItem {
  id: string;
  organization_id: string;
  recipient_user_id?: string | null;
  recipient_role?: string;
  type: string;
  severity: NotificationSeverity;
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

export interface OrgAttentionItemData {
  id: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  actionPath?: string;
  actionLabel?: string;
  resourceType?: string;
  resourceId?: string;
  createdAt: string;
  deduplicationKey?: string;
}

export interface NotificationsListResponse {
  notifications: OrgNotificationItem[];
  total: number;
  unreadCount: number;
}

export interface NotificationQueryParams {
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}

export const notificationApi = {
  getNotifications: async (params?: NotificationQueryParams): Promise<{ success: boolean; data: NotificationsListResponse }> => {
    const searchParams = new URLSearchParams();
    if (params?.unread_only !== undefined) searchParams.set('unread_only', String(params.unread_only));
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
    const qs = searchParams.toString();
    return httpClient.get(`/organizations/current/notifications${qs ? `?${qs}` : ''}`);
  },

  getUnreadCount: async (): Promise<{ success: boolean; data: { unreadCount: number } }> => {
    return httpClient.get('/organizations/current/notifications/unread-count');
  },

  getAttentionSummary: async (): Promise<{ success: boolean; data: { attentionItems: OrgAttentionItemData[] } }> => {
    return httpClient.get('/organizations/current/notifications/attention');
  },

  markAsRead: async (notificationId: string): Promise<{ success: boolean; data: { notification: OrgNotificationItem } }> => {
    return httpClient.patch(`/organizations/current/notifications/${notificationId}/read`);
  },

  markAllAsRead: async (): Promise<{ success: boolean; data: { count: number } }> => {
    return httpClient.post('/organizations/current/notifications/mark-all-read');
  },
};
