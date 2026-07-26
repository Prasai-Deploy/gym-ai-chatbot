import { httpClient } from './httpClient';

export const adminApi = {
  // All endpoints now point to /api/v1/admin/* (v2 backend)
  getDashboardData: async () => httpClient.get('/admin/dashboard-data'),
  getMembers: async (params?: { limit?: number; offset?: number; search?: string }) =>
    httpClient.get('/admin/members', { params }),
  getPlans: async () => httpClient.get('/admin/plans'),
  getMembershipPlans: async () => httpClient.get('/admin/membership-plans'),
  assignPlan: async (data: { user_id: string; plan_id: string }) =>
    httpClient.post('/admin/assign-plan', data),
};
