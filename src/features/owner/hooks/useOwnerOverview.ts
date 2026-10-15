import { useQuery } from '@tanstack/react-query';
import { organizationApi } from '../../../api/organizationApi';

export interface OwnerAttentionItem {
  id: string;
  level: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
}

export interface OwnerOverviewMetrics {
  totalMembers: number;
  activeStaffCount: number;
  totalLocations: number;
  todayCheckIns: number;
  currentlyInFacility: number;
}

export interface OwnerOverviewData {
  organization: {
    id: string;
    name: string;
    slug?: string;
    owner_id?: string;
    status: string;
  };
  locations: Array<{
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    is_primary: boolean;
  }>;
  branding: {
    business_name?: string;
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
    theme_mode?: string;
  } | null;
  staff: Array<{
    id: string;
    user_id: string;
    role: string;
    status: string;
    profiles?: {
      email?: string;
      full_name?: string;
      avatar_url?: string;
    };
  }>;
  metrics: OwnerOverviewMetrics;
  attentionItems: OwnerAttentionItem[];
}

export function useOwnerOverview() {
  return useQuery<OwnerOverviewData>({
    queryKey: ['owner', 'overview'],
    queryFn: async () => {
      const res: any = await organizationApi.getOverview();
      return res?.data || res;
    },
    staleTime: 60 * 1000, // 1 minute fresh cache
    retry: (failureCount, error: any) => {
      // Do not retry 403 Forbidden or 401 Unauthorized
      if (error?.status === 403 || error?.status === 401) return false;
      return failureCount < 2;
    },
  });
}

export function useUserOrganizations() {
  return useQuery({
    queryKey: ['owner', 'organizations'],
    queryFn: async () => {
      const res: any = await organizationApi.getUserOrganizations();
      return res?.data || res || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
