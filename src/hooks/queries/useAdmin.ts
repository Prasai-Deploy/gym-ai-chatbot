import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';

export const useAdminDashboardData = () => {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const res = await adminApi.getDashboardData() as any;
      return res?.data ?? res;
    }
  });
};

export const useAdminMembers = (params?: any) => {
  return useQuery({
    queryKey: ['admin', 'members', params],
    queryFn: async () => {
      const res = await adminApi.getMembers(params) as any;
      return res?.data ?? res;
    }
  });
};

export const useAdminPlans = () => {
  return useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: async () => {
      const res = await adminApi.getPlans() as any;
      return res?.data ?? res;
    }
  });
};

export const useAdminMembershipPlans = () => {
  return useQuery({
    queryKey: ['admin', 'membershipPlans'],
    queryFn: async () => {
      const res = await adminApi.getMembershipPlans() as any;
      return res?.data ?? res;
    }
  });
};

export const useAssignPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.assignPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
    }
  });
};
