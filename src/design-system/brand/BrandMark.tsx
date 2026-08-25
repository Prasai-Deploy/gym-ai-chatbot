import React, { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { cn } from '../tokens';
import { useBranding } from '../../context/BrandingContext';

/**
 * The gym's logo and name.
 *
 * Replaces the hardcoded `<Dumbbell />` + "STRIVA" wordmark that was repeated
 * across TopNav, Sidebar, Login, PageLoader and others. Every one of those
 * should render this instead — otherwise a white-labelled gym still sees
 * someone else's brand in their own app, which is the one thing the product
 * promises not to do.
 */

const SIZES = {
  sm: { box: 'w-8 h-8 rounded-xl', icon: 'w-4 h-4', text: 'text-sm' },
  md: { box: 'w-9 h-9 rounded-2xl', icon: 'w-5 h-5', text: 'text-base' },
  lg: { box: 'w-20 h-20 rounded-2xl', icon: 'w-10 h-10', text: 'text-5xl' },
} as const;

export interface BrandMarkProps {
  size?: keyof typeof SIZES;
  /** Set false for tight spaces (mobile dock, favicon-like contexts). */
  showWordmark?: boolean;
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  size = 'md',
  showWordmark = true,
  className,
}) => {
  const { businessName, logoUrl } = useBranding();

  // Fallback layer 3 (see below). A gym owner pasting a URL that 404s is the
  // single most likely support ticket this feature will generate, and without
  // this the app shows a broken-image icon in the header on every page.
  const [logoFailed, setLogoFailed] = useState(false);

  const s = SIZES[size];
  const showLogo = Boolean(logoUrl) && !logoFailed;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          s.box,
          'shrink-0 flex items-center justify-center overflow-hidden',
          showLogo
            ? 'bg-white/5'
            : // Fallback layer 2: no logo uploaded — a dumbbell tile tinted to
              // the gym's own colour. Visually identical to the old STRIVA mark
              // for a tenant who never changes the default.
              'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
        )}
      >
        {showLogo ? (
          <img
            src={logoUrl!}
            alt={businessName}
            className="w-full h-full object-contain"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <Dumbbell className={cn(s.icon, 'stroke-[2.5]')} />
        )}
      </div>

      {showWordmark && (
        <span
          className={cn(
            s.text,
            'font-black tracking-tight text-white font-display truncate'
          )}
        >
          {/* Fallback layer 1: businessName defaults to 'STRIVA' in
              DEFAULT_BRANDING, so this is never empty. */}
          {businessName}
        </span>
      )}
    </div>
  );
};

BrandMark.displayName = 'BrandMark';
