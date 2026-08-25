import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  Branding,
  DEFAULT_BRANDING,
  HEX_RE,
  applyBrandColor,
  readBrandingCache,
  writeBrandingCache,
} from '../lib/brandingCache';

/**
 * Per-gym white-label branding.
 *
 * How the whole mechanism fits together:
 *
 *   1. `index.html` has a boot script that reads the cached branding from
 *      localStorage and applies `--brand-base` BEFORE the stylesheet parses.
 *      That is what prevents a flash of the wrong colour on repeat visits.
 *
 *   2. This provider fetches the authoritative value after login, applies it,
 *      and refreshes the cache for next time.
 *
 *   3. `src/index.css` maps `--brand-base` onto `--color-brand-400..950`, so
 *      every `bg-brand-500` / `text-brand-400` / `border-brand-500/30` in the
 *      app follows automatically.
 *
 * The gym row is read straight from Supabase rather than through our API. The
 * "read own gym" RLS policy (migration 0002) already restricts a member to
 * their own gym, so a backend route would add nothing but a hop.
 */

interface BrandingContextValue extends Branding {
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextValue>({
  ...DEFAULT_BRANDING,
  isLoading: false,
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Seed from cache so React agrees with what the boot script already painted.
  // Without this the first render shows "STRIVA" in the header while the page
  // is already the tenant's colour.
  const [branding, setBranding] = useState<Branding>(
    () => readBrandingCache() ?? DEFAULT_BRANDING
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // RLS scopes this to the caller's own gym — there is no gym id in the
        // query because there cannot be one. `maybeSingle` rather than
        // `single` because a user whose profile has no gym_id yet (an owner
        // mid-signup) legitimately matches zero rows; that is not an error.
        const { data, error } = await supabase
          .from('gyms')
          .select('name, logo_url, primary_color')
          .maybeSingle();

        if (cancelled) return;

        if (error || !data) {
          setIsLoading(false);
          return;
        }

        const next: Branding = {
          businessName: data.name || DEFAULT_BRANDING.businessName,
          logoUrl: data.logo_url || null,
          primaryColor: HEX_RE.test(data.primary_color ?? '')
            ? data.primary_color
            : DEFAULT_BRANDING.primaryColor,
        };

        setBranding(next);
        applyBrandColor(next.primaryColor);
        document.title = next.businessName;
        writeBrandingCache(next);
      } catch {
        // Never blank the app over a branding failure — keep whatever is
        // cached, or the default.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <BrandingContext.Provider value={{ ...branding, isLoading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}

export type { Branding };
