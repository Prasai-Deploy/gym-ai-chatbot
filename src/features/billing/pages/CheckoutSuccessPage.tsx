import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { billingApi } from '../../../api/billingApi';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export const CheckoutSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tier = (searchParams.get('tier') as any) || 'pro';
    const interval = (searchParams.get('interval') as any) || 'monthly';

    // Verify and activate subscription on return
    billingApi.updateSubscription(tier, interval)
      .catch((err) => console.error('Subscription sync error:', err))
      .finally(() => setLoading(false));
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white">Payment Successful!</h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            {loading ? 'Activating your membership...' : 'Your STRIVA membership has been upgraded. All features are now unlocked.'}
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
        >
          Go to Dashboard <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
