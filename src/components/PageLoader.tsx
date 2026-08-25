import React from 'react';
import { Dumbbell } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';

/**
 * Route-transition loader.
 *
 * Renders inside <Suspense> in the router, which sits inside AppProviders, so
 * useBranding() is available here.
 *
 * This used to be hardcoded green (#22c55e) — the first thing every user saw
 * on a route change was a colour that appeared nowhere else in the product.
 * It now follows the tenant's brand.
 */
export const PageLoader: React.FC = () => {
  const { businessName } = useBranding();

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#090B10] z-50">
      <div className="w-16 h-16 rounded-full bg-[#131722] border-[0.5px] border-white/10 flex items-center justify-center mb-6 shadow-lg shadow-brand-500/10 relative">
        <Dumbbell size={28} className="text-brand-500 absolute z-10" />
        <div className="absolute inset-0 border-t-2 border-brand-500 rounded-full animate-spin" />
      </div>
      <h2 className="text-white font-bold text-lg tracking-wide mb-1">{businessName}</h2>
      <p className="text-[#888888] text-xs font-semibold uppercase tracking-widest">Loading...</p>
    </div>
  );
};
