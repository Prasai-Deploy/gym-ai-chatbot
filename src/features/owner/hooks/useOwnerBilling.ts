import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  orgBillingApi,
  OrgBillingStatusResponse,
  OrgInvoice,
  OrgFinancialSummary,
  CreateOrgCheckoutPayload,
  VerifyOrgPaymentPayload,
} from '../../../api/orgBillingApi';

export function useOrgBillingStatus() {
  return useQuery<OrgBillingStatusResponse>({
    queryKey: ['owner', 'billing', 'status'],
    queryFn: async () => {
      return orgBillingApi.getStatus();
    },
    staleTime: 30 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.status === 401) return false;
      return failureCount < 2;
    },
  });
}

export function useOrgInvoices(params?: { status?: string; limit?: number; offset?: number }) {
  return useQuery<{ invoices: OrgInvoice[]; total: number }>({
    queryKey: ['owner', 'billing', 'invoices', params],
    queryFn: async () => {
      return orgBillingApi.getInvoices(params);
    },
    staleTime: 30 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.status === 401) return false;
      return failureCount < 2;
    },
  });
}

export function useOrgFinancials(params?: { from?: string; to?: string }) {
  return useQuery<OrgFinancialSummary>({
    queryKey: ['owner', 'billing', 'financials', params],
    queryFn: async () => {
      return orgBillingApi.getFinancials(params);
    },
    staleTime: 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status === 403 || error?.status === 401) return false;
      return failureCount < 2;
    },
  });
}

export function useCreateOrgCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateOrgCheckoutPayload) => {
      return orgBillingApi.createCheckout(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'billing'] });
    },
  });
}

export function useVerifyOrgPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VerifyOrgPaymentPayload) => {
      return orgBillingApi.verifyPayment(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'billing'] });
    },
  });
}

export function useCancelOrgSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      cancelAtPeriodEnd = true,
      reason,
    }: {
      cancelAtPeriodEnd?: boolean;
      reason?: string;
    }) => {
      return orgBillingApi.cancelSubscription(cancelAtPeriodEnd, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'billing'] });
    },
  });
}
