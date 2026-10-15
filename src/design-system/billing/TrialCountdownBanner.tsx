import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEntitlement } from '../../hooks/useEntitlement';
import { Sparkles, AlertCircle, X, ArrowRight } from '../icons';
import { Button } from '../components/Button';

export const TrialCountdownBanner: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, hasAccess, daysRemaining, loading } = useEntitlement();
  const [dismissed, setDismissed] = useState(false);

  // Do not render during loading or on excluded pages (e.g. billing, pricing)
  if (loading) return null;

  const pathname = location.pathname.toLowerCase();
  const isExcludedPath =
    pathname.includes('/billing') ||
    pathname.includes('/pricing') ||
    pathname.includes('/checkout') ||
    pathname.includes('/login') ||
    pathname.includes('/admin');

  if (isExcludedPath) return null;

  // Active, Demo, Expired do not show this trial banner
  // Demo users have sandbox access; Expired users are handled by SubscriptionRequired
  if (state === 'DEMO' || state === 'ACTIVE' || state === 'EXPIRED') {
    return null;
  }

  // GRACE_PERIOD: Non-dismissible critical payment attention warning
  if (state === 'GRACE_PERIOD' && hasAccess) {
    return (
      <aside
        aria-label="Payment warning"
        className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-200 transition-all z-20"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
          <span className="font-medium truncate">
            Your payment needs attention. Your STRIVA access remains active during this grace period.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/v3/billing')}
            className="text-[11px] py-1 px-3 border-amber-500/30 text-amber-200 hover:bg-amber-500/20 hover:text-white"
          >
            Update billing
          </Button>
        </div>
      </aside>
    );
  }

  // TRIAL: Subtle, compact countdown banner
  if (state === 'TRIAL' && hasAccess && !dismissed) {
    const timeLabel =
      daysRemaining <= 0
        ? 'ends today'
        : daysRemaining === 1
        ? 'ends tomorrow'
        : `ends in ${daysRemaining} days`;

    return (
      <aside
        aria-label="Trial countdown"
        className="w-full bg-[#11141C] border-b border-slate-800/80 px-4 py-2 flex items-center justify-between gap-3 text-xs text-slate-300 transition-all z-20"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-3 h-3 text-orange-400" aria-hidden="true" />
          </div>
          <span className="font-medium truncate text-slate-200">
            Your STRIVA trial {timeLabel}.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/pricing')}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-400 hover:text-orange-300 transition-colors focus:outline-none focus-visible:underline cursor-pointer"
          >
            <span>View plans</span>
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss trial banner"
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </aside>
    );
  }

  return null;
};
