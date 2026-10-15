import { useQuery } from '@tanstack/react-query';
import {
  organizationApi,
  MemberQueryParams,
  MemberListItem,
  MemberPaginationMetadata,
  MemberDetailView,
} from '../../../api/organizationApi';

export interface UseOwnerMembersResult {
  members: MemberListItem[];
  pagination: MemberPaginationMetadata;
}

export function useOwnerMembers(params: MemberQueryParams = {}) {
  const { page = 1, limit = 10, search, status, role } = params;

  return useQuery<UseOwnerMembersResult>({
    queryKey: ['owner', 'members', { page, limit, search, status, role }],
    queryFn: async () => {
      const res: any = await organizationApi.getCurrentMembers({
        page,
        limit,
        search,
        status,
        role,
      });

      return {
        members: res?.data || [],
        pagination: res?.pagination || {
          total: res?.data?.length || 0,
          page,
          limit,
          totalPages: Math.ceil((res?.data?.length || 0) / limit) || 1,
        },
      };
    },
    staleTime: 30 * 1000, // 30 seconds fresh cache
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.status === 401) return false;
      return failureCount < 2;
    },
  });
}

export function useOwnerMemberDetail(memberId: string | null) {
  return useQuery<MemberDetailView | null>({
    queryKey: ['owner', 'member', memberId],
    queryFn: async () => {
      if (!memberId) return null;
      const res: any = await organizationApi.getMemberDetail(memberId);
      return res?.data || null;
    },
    enabled: Boolean(memberId),
    staleTime: 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.status === 401 || error?.status === 404) return false;
      return failureCount < 2;
    },
  });
}
