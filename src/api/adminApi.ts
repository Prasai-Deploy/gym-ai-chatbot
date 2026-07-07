import { httpClient } from './httpClient';

export const adminApi = {
  getDashboardData: async () => httpClient.get('/admin/dashboard-data'),
  getMembers: async (params?: any) => httpClient.get('/admin/members', { params }),
  getPlans: async () => httpClient.get('/admin/plans'),
  getMembershipPlans: async () => httpClient.get('/admin/membership-plans'),
  assignPlan: async (data: any) => httpClient.post('/admin/assign-plan', data),
};
