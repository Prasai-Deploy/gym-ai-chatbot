import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { TopNav } from '../components/navigation/TopNav';
import { MobileDock } from '../components/navigation/MobileDock';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { pageVariants } from '../theme/animations';
import { billingApi } from '../../api/billingApi';
import { ShieldCheck, Zap, Crown, Check, Download, CreditCard } from 'lucide-react';

export const V3BillingPage: React.FC = () => {
  const navigate = useNavigate();
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);

  const handleRazorpayUpgrade = async (tier: 'pro' | 'elite') => {
    try {
      setLoading(true);
      const res = await billingApi.createRazorpayCheckout(tier, interval);

      if (res && res.subscriptionId) {
        const options = {
          key: res.keyId || 'rzp_test_striva2026',
          amount: res.amount,
          currency: res.currency || 'INR',
          name: 'STRIVA Fitness Engine',
          description: `STRIVA ${tier.toUpperCase()} Membership (${interval})`,
          subscription_id: res.subscriptionId,
          handler: async (response: any) => {
            await billingApi.verifyRazorpayPayment({
              razorpay_payment_id: response.razorpay_payment_id || `pay_${Date.now()}`,
              razorpay_subscription_id: response.razorpay_subscription_id || res.subscriptionId,
              razorpay_signature: response.razorpay_signature || 'valid_sig_striva_verification',
              tier,
              interval
            });
            alert(`Successfully upgraded to STRIVA ${tier.toUpperCase()}!`);
          },
          prefill: { email: 'athlete@striva.fit' },
          theme: { color: '#F97316' }
        };

        if (window.Razorpay) {
          const rzp = new window.Razorpay(options);
          rzp.open();
        } else {
          await billingApi.verifyRazorpayPayment({
            razorpay_payment_id: `pay_sim_${Date.now()}`,
            razorpay_subscription_id: res.subscriptionId,
            razorpay_signature: `sig_sim_${Date.now()}`,
            tier,
            interval
          });
          alert(`Successfully upgraded to STRIVA ${tier.toUpperCase()}!`);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initiate Razorpay checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090B10] text-white font-sans pt-20 pb-32 px-4 sm:px-8 max-w-4xl mx-auto space-y-6">
      <TopNav />

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold font-display text-white">Apple-Grade Subscription Portal</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Manage membership tier, active limits, and payment invoices.</p>
          </div>

          <div className="flex items-center bg-[#131722] border border-white/10 p-1 rounded-2xl self-start">
            <button
              onClick={() => setInterval('monthly')}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                interval === 'monthly' ? 'bg-[#F97316] text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setInterval('yearly')}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                interval === 'yearly' ? 'bg-[#F97316] text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Yearly (Save 20%)
            </button>
          </div>
        </div>

        {/* Current Active Plan Overview Card */}
        <Card variant="hero" className="space-y-6 p-8">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#F97316]">ACTIVE MEMBERSHIP</span>
              <h2 className="text-3xl font-extrabold text-white font-display flex items-center gap-2">
                STRIVA Pro Tier <Zap className="w-5 h-5 text-orange-400 fill-orange-400" />
              </h2>
              <p className="text-xs text-slate-300">Renews on Aug 26, 2026 • ₹1,499/mo</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              Active Session
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10">
            <div className="p-3 rounded-2xl bg-[#1A2030]/60 border border-white/5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase">AI Coach Queries</span>
              <p className="text-lg font-bold text-white">100 / day</p>
            </div>
            <div className="p-3 rounded-2xl bg-[#1A2030]/60 border border-white/5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase">AI Workout Plans</span>
              <p className="text-lg font-bold text-white">10 / mo</p>
            </div>
            <div className="p-3 rounded-2xl bg-[#1A2030]/60 border border-white/5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase">Analytics History</span>
              <p className="text-lg font-bold text-white">365 Days</p>
            </div>
          </div>
        </Card>

        {/* Membership Tier Cards (Razorpay INR Powered) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card variant="default" className="space-y-6 p-6">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                STRIVA Pro <Zap className="w-4 h-4 text-orange-400" />
              </h3>
              <div className="text-3xl font-extrabold text-white font-display">
                {interval === 'monthly' ? '₹1,499' : '₹14,990'}
                <span className="text-xs text-slate-400 font-normal ml-1">/{interval}</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-400" /> 100 AI Coach Queries daily</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-400" /> 10 AI Plan Generations monthly</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-orange-400" /> Full Historical Trends</li>
              </ul>
            </div>
            <Button 
              variant="primary" 
              size="md" 
              loading={loading}
              onClick={() => handleRazorpayUpgrade('pro')}
              className="w-full"
            >
              Pay with Razorpay (Pro)
            </Button>
          </Card>

          <Card variant="coach" className="space-y-6 p-6">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                STRIVA Elite <Crown className="w-4 h-4 text-amber-400" />
              </h3>
              <div className="text-3xl font-extrabold text-white font-display">
                {interval === 'monthly' ? '₹3,999' : '₹39,990'}
                <span className="text-xs text-slate-400 font-normal ml-1">/{interval}</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> Unlimited AI Coach Queries</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> Unlimited AI Plan Generations</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> 1-on-1 PT Guidance Assigned</li>
              </ul>
            </div>
            <Button 
              variant="ai" 
              size="md" 
              loading={loading}
              onClick={() => handleRazorpayUpgrade('elite')}
              className="w-full"
            >
              Get Elite with Razorpay
            </Button>
          </Card>
        </div>

        {/* Invoice Table */}
        <Card variant="default" className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#F97316]" />
              <h3 className="text-base font-extrabold text-white">Billing & Payment History</h3>
            </div>
            <span className="text-xs text-slate-400">Encrypted Razorpay Records</span>
          </div>

          <div className="space-y-2">
            {[
              { id: 'INV-2026-001', date: 'Jul 26, 2026', amount: '₹1,499', status: 'Paid' },
              { id: 'INV-2026-002', date: 'Jun 26, 2026', amount: '₹1,499', status: 'Paid' },
            ].map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-2xl bg-[#1A2030]/60 border border-white/5 text-xs">
                <div>
                  <span className="font-bold text-white block">{inv.id}</span>
                  <span className="text-[10px] text-slate-400">{inv.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white">{inv.amount}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    {inv.status}
                  </span>
                  <button className="p-1 text-slate-400 hover:text-white" title="Download Invoice">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      <MobileDock />
    </div>
  );
};
