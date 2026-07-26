import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { billingApi, SubscriptionStatusResponse, InvoiceItem } from '../../../api/billingApi';
import { CreditCard, Calendar, ArrowUpRight, AlertCircle, Download, ArrowLeft, RefreshCw } from 'lucide-react';

export const BillingDashboard: React.FC = () => {
  const navigate = useNavigate();
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
        billingApi.getInvoices()
      ]);
      setData(statusRes);
      setInvoices(invoiceRes || []);
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
    if (!window.confirm('Are you sure you want to cancel your subscription renewal at the end of the current period?')) return;
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading Billing Information...
      </div>
    );
  }

  const sub = data?.subscription;
  const limits = data?.limits;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation */}
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Billing & Subscription</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">Manage your membership plan, billing cycle, and invoice history.</p>
          </div>
          
          <button
            onClick={() => navigate('/pricing')}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all"
          >
            Change Membership <ArrowUpRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded-xl flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 shrink-0" /> {error}
          </div>
        )}

        {/* Current Plan Overview Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Current Membership</span>
              <div className="flex items-center gap-3 mt-1">
                <h2 className="text-2xl font-bold uppercase text-white tracking-wide">{sub?.tier || 'Free'} Tier</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  sub?.status === 'active' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}>
                  {sub?.status || 'active'}
                </span>
              </div>
            </div>

            {sub?.tier !== 'free' && !sub?.cancel_at_period_end && (
              <button
                onClick={handleCancelSubscription}
                disabled={canceling}
                className="text-xs text-red-400 hover:text-red-300 underline font-medium self-start sm:self-auto"
              >
                {canceling ? 'Canceling...' : 'Cancel Subscription'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-slate-400" /> Billing Interval</span>
              <p className="text-sm font-semibold text-white capitalize mt-1">{sub?.interval || 'Monthly'}</p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Renewal Date</span>
              <p className="text-sm font-semibold text-white mt-1">
                {sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}
              </p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
              <span className="text-[11px] text-slate-400">Auto Renewal</span>
              <p className="text-sm font-semibold text-white mt-1">
                {sub?.cancel_at_period_end ? 'Will Cancel at Period End' : 'Active Auto-Renew'}
              </p>
            </div>
          </div>
        </div>

        {/* Feature Usage Limits */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Tier Usage Limits</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Daily AI Coach Queries</span>
                <span className="text-white font-bold">{limits?.ai_queries_daily === 99999 ? 'Unlimited' : limits?.ai_queries_daily} / day</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full w-1/4 rounded-full" />
              </div>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Monthly AI Plan Generations</span>
                <span className="text-white font-bold">{limits?.ai_plans_monthly === 99999 ? 'Unlimited' : limits?.ai_plans_monthly} / mo</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full w-1/3 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Invoice History */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Invoice History</h3>

          {invoices.length === 0 ? (
            <p className="text-slate-500 text-xs">No billing history available yet.</p>
          ) : (
            <div className="divide-y divide-slate-800 overflow-x-auto">
              {invoices.map((inv) => (
                <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-white">${inv.amount_paid} {inv.currency.toUpperCase()}</p>
                    <p className="text-slate-500 text-[11px]">{new Date(inv.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] uppercase font-bold">
                      {inv.status}
                    </span>
                    {inv.invoice_pdf && (
                      <a href={inv.invoice_pdf} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" /> PDF
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
