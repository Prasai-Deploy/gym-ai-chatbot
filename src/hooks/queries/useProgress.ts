import { useQuery } from '@tanstack/react-query';
import { progressApi } from '../../api/progressApi';

export const useProgressSummary = () => {
  return useQuery({
    queryKey: ['progress', 'summary'],
    queryFn: async () => {
      // httpClient interceptor already unwraps response.data once.
      // The result is the full API envelope: { success, data: ProgressStatistics }
      const res = await progressApi.getSummary() as any;
      return res?.data ?? res;
    }
  });
};

export const useProgressChartData = () => {
  return useQuery({
    queryKey: ['progress', 'chart'],
    queryFn: async () => {
      const res = await progressApi.getChartData() as any;
      return res?.data ?? res;
    }
  });
};
