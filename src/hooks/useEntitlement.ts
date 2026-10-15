import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { entitlementApi, EntitlementInfo, EntitlementState } from '../api/entitlementApi';

export const ENTITLEMENT_QUERY_KEY = ['entitlement', 'status'] as const;

export interface UseEntitlementResult {
  state: EntitlementState;
  hasAccess: boolean;
  daysRemaining: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  tier: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  limits: any;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
  isTrial: boolean;
  isActive: boolean;
  isGracePeriod: boolean;
  isExpired: boolean;
  isCancelled: boolean;
  isDemo: boolean;
}

export function useEntitlement(): UseEntitlementResult {
  const { user, loading: authLoading } = useAuth();

  const query = useQuery<EntitlementInfo, Error>({
    queryKey: ENTITLEMENT_QUERY_KEY,
    queryFn: async () => {
      return entitlementApi.getStatus();
    },
    enabled: !!user && !authLoading,
    staleTime: 60 * 1000, // 60 seconds stale time
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const isLoading = authLoading || (!!user && query.isLoading);
  const data = query.data;

  // Derive state safely with strict fail-closed defaults
  // If no data and not loading, or on error: fail closed (hasAccess: false, EXPIRED)
  const state: EntitlementState = data?.state ?? 'EXPIRED';
  const hasAccess: boolean = data?.hasAccess ?? false;
  const daysRemaining: number = data?.daysRemaining ?? 0;
  const trialEndsAt: string | null = data?.trialEndsAt ?? null;
  const currentPeriodEnd: string | null = data?.currentPeriodEnd ?? null;
  const tier: string = data?.tier ?? 'free';
  const status: string = data?.status ?? 'unknown';
  const cancelAtPeriodEnd: boolean = data?.cancelAtPeriodEnd ?? false;
  const limits = data?.limits ?? null;

  return {
    state,
    hasAccess,
    daysRemaining,
    trialEndsAt,
    currentPeriodEnd,
    tier,
    status,
    cancelAtPeriodEnd,
    limits,
    loading: isLoading,
    error: query.error || null,
    refetch: query.refetch,
    isTrial: state === 'TRIAL',
    isActive: state === 'ACTIVE',
    isGracePeriod: state === 'GRACE_PERIOD',
    isExpired: state === 'EXPIRED',
    isCancelled: state === 'CANCELLED',
    isDemo: state === 'DEMO',
  };
}
