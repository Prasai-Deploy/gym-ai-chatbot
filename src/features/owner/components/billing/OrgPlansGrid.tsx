import React from 'react';
import {
  Check,
  Building,
  Users,
  Shield,
  Sparkles,
  Lock,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { OrgSubscriptionPlan, OrgSubscription } from '../../../../api/orgBillingApi';

interface Props {
  plans: OrgSubscriptionPlan[];
  currentSubscription: OrgSubscription | null;
  onSelectPlan?: (planCode: string) => void;
  isLoadingCheckout?: boolean;
}

export const OrgPlansGrid: React.FC<Props> = ({
  plans,
  currentSubscription,
  onSelectPlan,
  isLoadingCheckout,
}) => {
  const currentPlanCode = currentSubscription?.plan?.plan_code;

  return (
    <div id="org-plans-section" className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-white tracking-tight">Gym Software License Plans</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Select an enterprise tier tailored to your facility headcount and operational scale
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const isCurrent = currentPlanCode === plan.plan_code && currentSubscription?.status === 'active';
          const isConfigured = plan.is_configured && plan.amount_paise !== null && plan.amount_paise > 0;
          const formattedPrice = isConfigured
            ? `₹${(plan.amount_paise! / 100).toLocaleString('en-IN')}`
            : null;

          return (
            <div
              key={plan.id}
              id={`plan-card-${plan.plan_code}`}
              className={`p-6 rounded-3xl bg-[#0a0d14] border transition-all flex flex-col justify-between relative ${
                isCurrent
                  ? 'border-orange-500/50 shadow-lg shadow-orange-500/5'
                  : 'border-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-extrabold uppercase tracking-wider shadow">
                  Current Active Plan
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-base font-bold text-white">{plan.name}</h4>
                  {plan.plan_code === 'gym_growth' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                      Popular
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-2 min-h-[36px]">
                  {plan.description || 'Enterprise software management license.'}
                </p>

                {/* Price Display */}
                <div className="my-5 p-4 rounded-2xl bg-[#05070c] border border-white/[0.04]">
                  {isConfigured ? (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white tracking-tight">{formattedPrice}</span>
                        <span className="text-xs text-slate-400 font-semibold">/{plan.interval}</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-medium block mt-1">
                        Server-authoritative rate
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm font-bold">Awaiting Approval</span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-1">
                        Pricing decision unfinalized · Checkout locked
                      </span>
                    </div>
                  )}
                </div>

                {/* Feature Entitlements */}
                <div className="space-y-2.5 my-5 text-xs">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <Building className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>Up to {plan.max_locations} Facility {plan.max_locations > 1 ? 'Locations' : 'Location'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <Users className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>{plan.max_staff} Staff Seats & Roles</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Up to {plan.max_members} Registered Members</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>QR Attendance & Check-In System</span>
                  </div>
                  {plan.features?.ai_coach && (
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>TRINETRA AI Coach Integration</span>
                    </div>
                  )}
                  {plan.features?.custom_branding && (
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Custom White-Label Branding</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-white/[0.04]">
                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full min-h-[44px] py-2.5 rounded-xl bg-white/[0.05] text-slate-400 text-xs font-bold cursor-default flex items-center justify-center text-center"
                  >
                    Active Plan
                  </button>
                ) : isConfigured ? (
                  <button
                    type="button"
                    id={`select-plan-${plan.plan_code}`}
                    onClick={() => onSelectPlan?.(plan.plan_code)}
                    disabled={isLoadingCheckout}
                    className="w-full min-h-[44px] py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  >
                    {isLoadingCheckout ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Select Plan</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Pricing pending executive owner approval"
                    className="w-full min-h-[44px] py-2.5 rounded-xl bg-white/[0.02] text-slate-500 border border-white/[0.04] text-xs font-medium cursor-not-allowed flex items-center justify-center text-center"
                  >
                    Approval Required
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
