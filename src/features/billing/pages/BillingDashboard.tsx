import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { billingApi, SubscriptionStatusResponse, InvoiceItem } from '../../../api/billingApi';
import { useEntitlement } from '../../../hooks/useEntitlement';
import {
  CreditCard,
  Calendar,
  ArrowUpRight,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  CheckCircle2,
} from '../../../design-system/icons';

export const BillingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    state,
    daysRemaining,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    isTrial,
    isActive,
    isGracePeriod,
    isExpired,
    isDemo,
    refetch: refetchEntitlement,
  } = useEntitlement();

  const [data, setData] = useState<SubscriptionStatusResponse | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statusRes, invoiceRes] = await Promise.all([
        billingApi.getStatus(),
        billingApi.getInvoices(),
      ]);
      setData(statusRes);
      setInvoices(invoiceRes || []);
      await refetchEntitlement();
    } catch (err: any) {
      setError(err?.message || 'Failed to load billing status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your STRIVA subscription auto-renewal at the end of the current period?')) return;
    try {
      setCanceling(true);
      await billingApi.cancelSubscription();
      await fetchBillingData();
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel subscription');
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center text-slate-400 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-lime-400" />
        <span>Loading Membership Billing...</span>
      </div>
    );
  }

  const sub = data?.subscription;
  const renewalDate = currentPeriodEnd || sub?.current_period_end;
  const intervalDisplay = sub?.interval === 'yearly' ? 'Annual (₹6,999/yr)' : 'Monthly (₹799/mo)';

  // Determine single-plan display labels
  const planHeading = isTrial
    ? 'STRIVA 14-Day Free Trial'
    : isDemo
    ? 'STRIVA Demo Sandbox'
    : 'STRIVA Membership';

  const planSubtext = isTrial
    ? `${daysRemaining} days remaining in your free trial.`
    : isActive
    ? `Active subscription · ${sub?.interval === 'yearly' ? '₹6,999/year (~₹583/mo)' : '₹799/month'}`
    : isGracePeriod
    ? 'Payment needs attention. Access remains active during grace period.'
    : isExpired
    ? 'Membership required. Choose a plan to restore full access.'
    : isDemo
    ? 'Sandbox mode with full access simulation.'
    : 'STRIVA Fitness Operating System';

  const statusBadge = isTrial
    ? { text: `Trial · ${daysRemaining}d left`, color: 'bg-lime-500/10 border-lime-500/30 text-lime-400' }
    : isActive
    ? { text: 'Active', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' }
    : isGracePeriod
    ? { text: 'Payment Attention', color: 'bg-amber-500/10 border-amber-500/30 text-amber-400' }
    : isExpired
    ? { text: 'Membership Required', color: 'bg-red-500/10 border-red-500/30 text-red-400' }
    : { text: state, color: 'bg-slate-800 border-slate-700 text-slate-300' };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 p-4 sm:p-8 pb-28 sm:pb-12 font-sans select-none">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Navigation */}
        <button 
          onClick={() => navigate('/v3/dashboard')} 
          className="flex items-center text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
              Billing & Subscription
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Manage your STRIVA athlete membership plan, renewal cycle, and payment receipts.
            </p>
          </div>
          
          <button
            onClick={() => navigate('/pricing')}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-lime-500 hover:bg-lime-400 text-black text-xs font-extrabold rounded-xl shadow-lg shadow-lime-500/20 transition-all cursor-pointer"
          >
            <span>{isActive ? 'Manage Plan' : 'View Plans'}</span>
            <ArrowUpRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-4 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 mr-1 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Current Membership Overview Card */}
        <div className="bg-[#11141D] border border-white/[0.07] rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-sans">
                Current Plan
              </span>
              <div className="flex items-center gap-3 mt-1.5">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide font-display">
                  {planHeading}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusBadge.color}`}>
                  {statusBadge.text}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {planSubtext}
              </p>
            </div>

            {isActive && !cancelAtPeriodEnd && (
              <button
                onClick={handleCancelSubscription}
                disabled={canceling}
                className="text-xs text-red-400 hover:text-red-300 underline font-medium self-start sm:self-auto cursor-pointer"
              >
                {canceling ? 'Canceling...' : 'Cancel Auto-Renew'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="bg-[#181C28]/60 p-4 rounded-xl border border-white/[0.04]">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Billing Cycle
              </span>
              <p className="text-sm font-semibold text-white mt-1">
                {isTrial ? '14-Day Free Trial' : intervalDisplay}
              </p>
            </div>

            <div className="bg-[#181C28]/60 p-4 rounded-xl border border-white/[0.04]">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {isTrial ? 'Trial Expiration' : 'Renewal Date'}
              </span>
              <p className="text-sm font-semibold text-white mt-1">
                {renewalDate ? new Date(renewalDate).toLocaleDateString() : 'Active'}
              </p>
            </div>

            <div className="bg-[#181C28]/60 p-4 rounded-xl border border-white/[0.04]">
              <span className="text-[11px] text-slate-400">Renewal Status</span>
              <p className="text-sm font-semibold text-white mt-1">
                {cancelAtPeriodEnd
                  ? 'Cancels at Period End'
                  : isTrial
                  ? 'No Auto-Charge'
                  : 'Active Auto-Renew'}
              </p>
            </div>
          </div>
        </div>

        {/* Feature Entitlements Overview */}
        <div className="bg-[#11141D] border border-white/[0.07] rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Included STRIVA Features</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#181C28]/60 border border-white/[0.04]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>TRINETRA AI Coach Guidance</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#181C28]/60 border border-white/[0.04]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Full Workout Execution & Logging</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#181C28]/60 border border-white/[0.04]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Nutrition & Hydration Tracking</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#181C28]/60 border border-white/[0.04]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Biometrics & Progress Analytics</span>
            </div>
          </div>
        </div>

        {/* Invoice History */}
        <div className="bg-[#11141D] border border-white/[0.07] rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="text-base font-bold text-white">Payment & Invoice History</h3>

          {invoices.length === 0 ? (
            <p className="text-slate-500 text-xs py-2">No payment transactions recorded yet.</p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {invoices.map((inv) => (
                <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-white">
                      ₹{inv.amount_paid} {inv.currency?.toUpperCase() === 'INR' ? '' : inv.currency?.toUpperCase()}
                    </p>
                    <p className="text-slate-500 text-[11px]">{new Date(inv.created_at).toLocaleDateString()}</p>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {inv.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
