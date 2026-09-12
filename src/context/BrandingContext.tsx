import React, { createContext, useContext, useEffect, useState } from "react";
import { httpClient } from "../api/httpClient";
import { useAuth } from "./AuthContext";
import {
  Branding,
  DEFAULT_BRANDING,
  HEX_RE,
  applyBrandColor,
  readBrandingCache,
  writeBrandingCache,
} from "../lib/brandingCache";

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
 * Branding is loaded through the authenticated API. The backend verifies the
 * user's organization membership before using its service-role database client.
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
    () => readBrandingCache() ?? DEFAULT_BRANDING,
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
        const response = (await httpClient.get(
          "/organizations/branding",
        )) as any;
        const data = response?.data ?? response;

        if (cancelled) return;

        if (!data) {
          setIsLoading(false);
          return;
        }

        const next: Branding = {
          businessName: data.business_name || DEFAULT_BRANDING.businessName,
          logoUrl: data.logo_url || null,
          primaryColor: HEX_RE.test(data.primary_color ?? "")
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
