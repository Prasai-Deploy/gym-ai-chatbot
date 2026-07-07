import { useQuery } from '@tanstack/react-query';
import { progressApi } from '../../api/progressApi';

export const useProgressSummary = () => {
  return useQuery({
    queryKey: ['progress', 'summary'],
    queryFn: async () => {
      const res = await progressApi.getSummary();
      return res.data; // Assuming backend wraps in { data: ... }
    }
  });
};

export const useProgressChartData = () => {
  return useQuery({
    queryKey: ['progress', 'chart'],
    queryFn: async () => {
      const res = await progressApi.getChartData();
      return res.data;
    }
  });
};
