import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { entitlementApi, EntitlementInfo } from '../../../api/entitlementApi';
import { ENTITLEMENT_QUERY_KEY } from '../../../hooks/useEntitlement';
import { CheckCircle2, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

export const CheckoutSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [entitlement, setEntitlement] = useState<EntitlementInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      // Invalidate entitlement query so app shell and hooks immediately refresh
      await queryClient.invalidateQueries({ queryKey: ENTITLEMENT_QUERY_KEY });
      const status = await entitlementApi.getStatus();
      setEntitlement(status);
    } catch (err: any) {
      console.error('[CheckoutSuccess] Error checking status:', err);
      setError('Unable to confirm subscription state right now. Please check your billing dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const isConfirmed = entitlement?.hasAccess && (entitlement.state === 'ACTIVE' || entitlement.state === 'TRIAL');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
        <div
          className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${
            isConfirmed
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-orange-500/10 border border-orange-500/30 text-orange-400'
          }`}
        >
          {loading ? (
            <RefreshCw className="w-8 h-8 animate-spin text-orange-400" />
          ) : isConfirmed ? (
            <CheckCircle2 className="w-8 h-8" />
          ) : (
            <AlertCircle className="w-8 h-8" />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white">
            {loading
              ? 'Verifying Payment...'
              : isConfirmed
              ? 'Membership Active!'
              : 'Payment Processing'}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            {loading
              ? 'Synchronizing your subscription with STRIVA authorization services...'
              : isConfirmed
              ? 'Your STRIVA membership is confirmed. Full access to Coach, Workout, Nutrition, and Progress is active.'
              : 'Your payment was received and is synchronizing with STRIVA. If access does not unlock immediately, please refresh your billing status.'}
          </p>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Go to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {!isConfirmed && !loading && (
            <button
              onClick={checkStatus}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-check Subscription Status</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
