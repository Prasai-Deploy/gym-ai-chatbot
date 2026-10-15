import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { billingApi } from '../../../api/billingApi';
import { useEntitlement } from '../../../hooks/useEntitlement';
import { useAuth } from '../../../context/AuthContext';
import { Check, ArrowLeft, ShieldCheck, CreditCard, Sparkles, AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isTrial, isActive, isExpired, daysRemaining } = useEntitlement();
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/pricing' } } });
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create Razorpay Subscription Checkout Order with server-authoritative pricing
      const res = await billingApi.createRazorpayCheckout(interval);

      if (res && res.subscriptionId) {
        const options = {
          key: res.keyId,
          amount: res.amount,
          currency: res.currency || 'INR',
          name: 'STRIVA Fitness Operating System',
          description: `STRIVA Membership (${interval === 'yearly' ? 'Annual' : 'Monthly'})`,
          subscription_id: res.subscriptionId,
          handler: async (response: any) => {
            try {
              if (!response?.razorpay_payment_id || !response?.razorpay_signature) {
                throw new Error('Payment transaction returned missing cryptographic signature');
              }
              // Verify Payment Signature on Backend
              await billingApi.verifyRazorpayPayment({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id || res.subscriptionId,
                razorpay_signature: response.razorpay_signature,
                interval,
              });
              navigate(`/checkout/success?interval=${interval}`);
            } catch (vErr: any) {
              setError(vErr?.message || 'Payment signature verification failed.');
            }
          },
          prefill: {
            name: 'STRIVA Athlete',
          },
          theme: {
            color: '#F97316',
          },
        };

        if (window.Razorpay) {
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (response: any) {
            setError(`Payment declined: ${response?.error?.description || 'Transaction unsuccessful'}`);
          });
          rzp.open();
        } else {
          setError('Razorpay Checkout SDK is unavailable. Please check your connection or ad-blocker settings.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const ctaLabel = isLoading
    ? 'Preparing Checkout...'
    : !user
    ? 'Start with 14 Days Free'
    : isActive
    ? 'Active Membership'
    : isExpired
    ? 'Continue with STRIVA'
    : isTrial
    ? `Continue with STRIVA (${daysRemaining}d left in trial)`
    : 'Start with 14 Days Free';

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 p-4 sm:p-8 font-sans antialiased selection:bg-orange-500/30 selection:text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(user ? '/v3/billing' : '/')} 
            className="inline-flex items-center text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> {user ? 'Back to Billing' : 'Back to Home'}
          </button>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-[11px] font-medium">
            <CreditCard className="w-3.5 h-3.5 text-orange-400" />
            <span>Secure Razorpay Checkout</span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>14-Day Free Trial Included</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white font-display">
            STRIVA
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto font-sans leading-relaxed">
            Your AI-powered fitness operating system. Start with 14 days free. Continue with STRIVA for ₹799/month or ₹6,999/year.
          </p>
        </div>

        {/* Billing Interval Selector */}
        <div className="flex justify-center">
          <div 
            role="radiogroup" 
            aria-label="Billing Interval"
            className="inline-flex items-center bg-[#090B10] border border-slate-800 p-1 rounded-2xl"
          >
            <button
              type="button"
              role="radio"
              aria-checked={interval === 'monthly'}
              onClick={() => setInterval('monthly')}
              className={`px-5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                interval === 'monthly'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Monthly · ₹799/mo
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={interval === 'yearly'}
              onClick={() => setInterval('yearly')}
              className={`px-5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                interval === 'yearly'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Annual · ₹6,999/yr</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                interval === 'yearly'
                  ? 'bg-black/30 text-white'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}>
                Save ~27%
              </span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs sm:text-sm p-4 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Single Canonical Plan Card */}
        <div className="bg-[#0C0E14] border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          {interval === 'yearly' && (
            <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-2xl shadow-sm">
              Best Value
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                STRIVA Membership
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Full access to the complete STRIVA intelligence and execution suite.
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                  {interval === 'yearly' ? '₹6,999' : '₹799'}
                </span>
                <span className="text-xs sm:text-sm text-slate-400 font-medium">
                  {interval === 'yearly' ? '/ year' : '/ month'}
                </span>
              </div>
              {interval === 'yearly' ? (
                <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                  Equivalent to ~₹583/month · Save ~27%
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Billed monthly · Cancel anytime
                </p>
              )}
            </div>
          </div>

          {/* Included Features List */}
          <div className="py-6 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Everything included in STRIVA:
            </span>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 pt-1">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-orange-400 shrink-0" />
                <span>TRINETRA AI Coach</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Personalized workouts</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Nutrition guidance</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Progress tracking</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Hydration tracking</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Personalized fitness memory</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-orange-400 shrink-0" />
                <span>AI recommendations</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Workout logging</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Nutrition logging</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Biometric insights</span>
              </li>
            </ul>
          </div>

          {/* CTA & Actions */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleCheckout}
              disabled={isLoading || isActive}
              className="w-full sm:flex-1 py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{ctaLabel}</span>
            </button>
          </div>
        </div>

        {/* Footer Guarantees */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-slate-500 text-xs pt-4 border-t border-slate-900 text-center">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Cancel anytime</span>
          </span>
          <span>•</span>
          <span>Razorpay HMAC Encrypted</span>
          <span>•</span>
          <span>UPI, RuPay, Cards & NetBanking</span>
        </div>

      </div>
    </div>
  );
};
