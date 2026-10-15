import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Shield,
  XCircle,
  Loader2,
} from 'lucide-react';
import { OrgSubscription } from '../../../../api/orgBillingApi';
import { useCancelOrgSubscription } from '../../hooks/useOwnerBilling';

interface Props {
  subscription: OrgSubscription | null;
  onRefresh?: () => void;
}

export const OrgSubscriptionCard: React.FC<Props> = ({ subscription, onRefresh }) => {
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const cancelMutation = useCancelOrgSubscription();

  const status = subscription?.status || 'none';
  const plan = subscription?.plan;

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({ cancelAtPeriodEnd: true });
      setShowConfirmCancel(false);
      onRefresh?.();
    } catch {
      // Error handled by query/mutation state
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active Software License
          </span>
        );
      case 'pending_checkout':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3.5 h-3.5" />
            Pending Payment
          </span>
        );
      case 'past_due':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            Payment Past Due
          </span>
        );
      case 'grace_period':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Grace Period
          </span>
        );
      case 'cancelled':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            No Active Subscription
          </span>
        );
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      id="org-subscription-card"
      className="p-6 rounded-3xl bg-gradient-to-br from-[#0a0d14] to-[#07090e] border border-white/[0.08] shadow-2xl relative overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-inner">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {plan?.name || 'STRIVA Gym Owner OS'}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Enterprise software subscription for gym facility administration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getStatusBadge()}
        </div>
      </div>

      {/* Subscription Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-6">
        <div className="p-4 rounded-2xl bg-[#0e121b]/60 border border-white/[0.04]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Plan Tier
          </span>
          <span className="text-sm font-bold text-white mt-1 block">
            {plan?.name || 'Unsubscribed'}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Code: {plan?.plan_code || 'none'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e121b]/60 border border-white/[0.04]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Billing Frequency
          </span>
          <span className="text-sm font-bold text-white mt-1 capitalize block">
            {subscription?.billing_interval || 'Monthly'}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Auto-renewing cycle
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e121b]/60 border border-white/[0.04]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Current Period End
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-sm font-bold text-white">
              {formatDate(subscription?.current_period_end)}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {subscription?.cancel_at_period_end
              ? 'Access terminates at period end'
              : 'Renews automatically'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e121b]/60 border border-white/[0.04]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Provider Identity
          </span>
          <span className="text-sm font-bold text-white mt-1 block truncate font-mono text-xs">
            {subscription?.razorpay_subscription_id || subscription?.razorpay_order_id || 'Direct License'}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Razorpay HMAC verified
          </span>
        </div>
      </div>

      {/* Subscription Action Bar */}
      {status === 'active' && !subscription?.cancel_at_period_end && (
        <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Guaranteed tenant data isolation and uptime SLA</span>
          </div>

          {!showConfirmCancel ? (
            <button
              type="button"
              id="cancel-sub-button"
              onClick={() => setShowConfirmCancel(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/[0.08] hover:border-red-500/20 text-xs font-semibold transition-colors"
            >
              Cancel Subscription
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300">Cancel at cycle end?</span>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="px-3 py-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/30 flex items-center gap-1.5 transition-colors"
              >
                {cancelMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmCancel(false)}
                className="px-2.5 py-1 rounded-xl bg-white/[0.05] text-slate-400 hover:text-white text-xs font-semibold"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {subscription?.cancel_at_period_end && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            Subscription is scheduled for cancellation. Access remains active until {formatDate(subscription?.current_period_end)}.
          </span>
        </div>
      )}
    </div>
  );
};
