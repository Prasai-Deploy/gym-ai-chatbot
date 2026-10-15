import { useQuery } from '@tanstack/react-query';
import { analyticsApi, TimeWindow, OwnerAnalyticsOverviewResponse } from '../../../api/analyticsApi';

export function useOwnerAnalytics(window: TimeWindow = '30d') {
  return useQuery<OwnerAnalyticsOverviewResponse>({
    queryKey: ['owner', 'analytics', window],
    queryFn: async () => {
      const data = await analyticsApi.getOverview({ window });
      return data;
    },
    staleTime: 60 * 1000, // 1 minute
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.status === 401) return false;
      return failureCount < 2;
    },
  });
}
