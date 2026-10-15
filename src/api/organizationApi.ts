import { httpClient } from './httpClient';

export interface MemberQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'trial' | 'inactive';
  role?: string;
}

export interface MemberListItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  status: 'active' | 'trial' | 'inactive';
  membershipTier: string | null;
  isTrial: boolean;
  trialEndsAt: string | null;
  joinedAt: string;
  lastActivityAt: string | null;
  locationId?: string | null;
  locationName?: string | null;
}

export interface MemberPaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedMembersResult {
  items: MemberListItem[];
  pagination: MemberPaginationMetadata;
}

export interface MemberDetailView {
  id: string;
  userId: string;
  organizationId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  timezone: string;
  role: string;
  status: 'active' | 'trial' | 'inactive';
  joinedAt: string;
  locationId: string | null;
  locationName: string | null;
  membership: {
    status: 'active' | 'trial' | 'inactive';
    tier: string | null;
    isTrial: boolean;
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
  };
  fitnessSummary: {
    level: string | null;
    primaryGoal: string | null;
  } | null;
  activitySummary: {
    lastCheckInAt: string | null;
    totalCheckIns: number;
  };
}

export const organizationApi = {
  getUserOrganizations: async () => httpClient.get('/organizations'),
  getCurrentOrganization: async () => httpClient.get('/organizations/current'),
  getOverview: async () => httpClient.get('/organizations/current/overview'),
  getStaff: async () => httpClient.get('/organizations/current/staff'),
  getCurrentMembers: async (params?: MemberQueryParams): Promise<{ success: boolean; data: MemberListItem[]; pagination: MemberPaginationMetadata }> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.role && params.role !== 'all') query.set('role', params.role);
    const qs = query.toString();
    return httpClient.get(`/organizations/current/members${qs ? `?${qs}` : ''}`);
  },
  getMemberDetail: async (memberId: string): Promise<{ success: boolean; data: MemberDetailView }> => {
    return httpClient.get(`/organizations/current/members/${memberId}`);
  },
  getOrganizationById: async (id: string) => httpClient.get(`/organizations/${id}`),
  getOrganizationLocations: async (id: string) => httpClient.get(`/organizations/${id}/locations`),
  getOrganizationMembers: async (id: string, params?: MemberQueryParams) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.role && params.role !== 'all') query.set('role', params.role);
    const qs = query.toString();
    return httpClient.get(`/organizations/${id}/members${qs ? `?${qs}` : ''}`);
  },
  getOrganizationBranding: async () => httpClient.get('/organizations/branding'),
};
