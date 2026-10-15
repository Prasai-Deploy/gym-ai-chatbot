import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  notificationApi,
  NotificationQueryParams,
  OrgNotificationItem,
  OrgAttentionItemData,
} from '../../../api/notificationApi';

export function useOwnerNotifications(params?: NotificationQueryParams) {
  return useQuery({
    queryKey: ['owner-notifications', params],
    queryFn: async () => {
      const res = await notificationApi.getNotifications(params);
      return res.data;
    },
    staleTime: 1000 * 15,
  });
}

export function useOwnerNotificationCount() {
  return useQuery({
    queryKey: ['owner-notifications-unread-count'],
    queryFn: async () => {
      const res = await notificationApi.getUnreadCount();
      return res.data?.unreadCount ?? 0;
    },
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 30, // 30-second bounded background refresh
  });
}

export function useOwnerAttentionSummary() {
  return useQuery({
    queryKey: ['owner-attention-summary'],
    queryFn: async () => {
      const res = await notificationApi.getAttentionSummary();
      return res.data?.attentionItems ?? [];
    },
    staleTime: 1000 * 20,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationApi.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['owner-notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['owner-attention-summary'] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['owner-notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['owner-attention-summary'] });
    },
  });
}
