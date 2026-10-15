import React, { useState } from 'react';
import { RefreshCw, AlertCircle, CreditCard, ShieldAlert } from 'lucide-react';
import { OwnerHeader } from '../components/OwnerHeader';
import { OwnerNav } from '../components/OwnerNav';
import { useOwnerOverview } from '../hooks/useOwnerOverview';
import {
  useOrgBillingStatus,
  useOrgInvoices,
  useOrgFinancials,
  useCreateOrgCheckout,
  useVerifyOrgPayment,
} from '../hooks/useOwnerBilling';
import { OrgSubscriptionCard } from '../components/billing/OrgSubscriptionCard';
import { SetupRequiredNotice } from '../components/billing/SetupRequiredNotice';
import { OrgPlansGrid } from '../components/billing/OrgPlansGrid';
import { OrgFinancialsSummaryCard } from '../components/billing/OrgFinancialsSummaryCard';
import { OrgInvoiceTable } from '../components/billing/OrgInvoiceTable';

export const OwnerBillingPage: React.FC = () => {
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Load organization header context
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
  } = useOwnerOverview();

  // Load organization billing telemetry
  const {
    data: billingStatus,
    isLoading: isBillingLoading,
    isError: isBillingError,
    error: billingErrorObj,
    refetch: refetchBilling,
    isFetching: isBillingFetching,
  } = useOrgBillingStatus();

  // Load invoices
  const {
    data: invoicesData,
    isLoading: isInvoicesLoading,
    refetch: refetchInvoices,
  } = useOrgInvoices({ limit: 50 });

  // Load financials
  const {
    data: financialsData,
    isLoading: isFinancialsLoading,
    refetch: refetchFinancials,
  } = useOrgFinancials();

  const checkoutMutation = useCreateOrgCheckout();
  const verifyMutation = useVerifyOrgPayment();

  const primaryLocation =
    overviewData?.locations?.find((l) => l.is_primary)?.name ||
    overviewData?.locations?.[0]?.name;

  const handleRefreshAll = () => {
    refetchBilling();
    refetchInvoices();
    refetchFinancials();
  };

  const handleSelectPlan = async (planCode: string) => {
    setCheckoutError(null);
    try {
      const intent = await checkoutMutation.mutateAsync({
        plan_code: planCode,
        interval: 'monthly',
      });

      // If Razorpay SDK is available on window, open it
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        const rzp = new (window as any).Razorpay({
          key: intent.keyId,
          order_id: intent.orderId,
          name: 'STRIVA Gym Owner OS',
          description: intent.plan_name,
          handler: async (response: any) => {
            try {
              await verifyMutation.mutateAsync({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                plan_code: planCode,
              });
              handleRefreshAll();
            } catch (err: any) {
              setCheckoutError(err?.message || 'Payment verification failed.');
            }
          },
        });
        rzp.open();
      } else {
        // In local development or automated test mode without Razorpay script
        setCheckoutError(
          `Checkout intent created (${intent.orderId}). Live Razorpay checkout script is required for interactive modal presentation.`
        );
      }
    } catch (err: any) {
      setCheckoutError(
        err?.message || 'Checkout failed. Ensure B2B pricing and credentials are fully approved.'
      );
    }
  };

  const isLoading = isOverviewLoading || isBillingLoading;

  return (
    <div className="min-h-screen bg-[#050608] text-white flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* 1. Header with Organization Identity */}
      <OwnerHeader
        organizationName={overviewData?.organization?.name || 'Facility'}
        primaryLocationName={primaryLocation}
        totalLocations={overviewData?.locations?.length}
        status={overviewData?.organization?.status}
        currentOrgId={overviewData?.organization?.id}
      />

      {/* 2. Canonical Owner Navigation */}
      <OwnerNav />

      {/* 3. Main Billing Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-7">
        {/* Title & Refresh Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-orange-400" />
                Gym Software Billing & Licenses
              </h1>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                Phase 8H B2B
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Manage facility software subscriptions, available enterprise tiers, auditable receipts, and collections.
            </p>
          </div>

          <button
            type="button"
            id="refresh-billing-button"
            onClick={handleRefreshAll}
            disabled={isBillingFetching}
            className="self-start sm:self-auto min-h-[44px] px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBillingFetching ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        {/* Global Error Banner */}
        {isBillingError && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <span className="text-xs font-bold block">Failed to load organization billing telemetry</span>
                <span className="text-[11px] text-red-300/80 block">
                  {(billingErrorObj as any)?.message || 'Database query failed or unauthorized organization context.'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRefreshAll}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-white text-xs font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Retry
            </button>
          </div>
        )}

        {/* Checkout Error Modal / Alert */}
        {checkoutError && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400" />
              <div>
                <span className="text-xs font-bold block">Checkout Notice</span>
                <span className="text-[11px] text-amber-200/90 block">{checkoutError}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutError(null)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-44 rounded-3xl bg-[#0a0d14] border border-white/[0.04]" />
            <div className="h-64 rounded-3xl bg-[#0a0d14] border border-white/[0.04]" />
            <div className="h-48 rounded-3xl bg-[#0a0d14] border border-white/[0.04]" />
          </div>
        ) : (
          <>
            {/* Setup Required State / Decision Guard */}
            <SetupRequiredNotice
              pricingConfigured={billingStatus?.pricingStatus === 'configured'}
              taxConfigured={billingStatus?.taxStatus === 'configured'}
            />

            {/* Active Subscription State */}
            <OrgSubscriptionCard
              subscription={billingStatus?.subscription || null}
              onRefresh={handleRefreshAll}
            />

            {/* Financial Collections Summary */}
            <OrgFinancialsSummaryCard
              financials={financialsData || null}
              isLoading={isFinancialsLoading}
            />

            {/* Available Gym Software Plans */}
            <OrgPlansGrid
              plans={billingStatus?.availablePlans || []}
              currentSubscription={billingStatus?.subscription || null}
              onSelectPlan={handleSelectPlan}
              isLoadingCheckout={checkoutMutation.isPending}
            />

            {/* Invoices & Receipts Ledger */}
            <OrgInvoiceTable
              invoices={invoicesData?.invoices || []}
              isLoading={isInvoicesLoading}
            />
          </>
        )}
      </main>
    </div>
  );
};
