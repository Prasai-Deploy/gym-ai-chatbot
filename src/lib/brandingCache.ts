/**
 * Storage helpers for per-gym branding.
 *
 * This lives in its own module on purpose. `BrandingContext` imports `useAuth`
 * from `AuthContext`, and `AuthContext` needs to clear the cache on logout —
 * importing directly between the two would create a cycle that works until a
 * bundler reorders the modules and then fails confusingly at runtime.
 *
 * The shape written here must stay in sync with the boot script in
 * `index.html`, which reads the same key before React exists.
 */

export interface Branding {
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
}

export const DEFAULT_BRANDING: Branding = {
  businessName: 'STRIVA',
  logoUrl: null,
  primaryColor: '#F97316',
};

export const BRANDING_STORAGE_KEY = 'striva-branding';

/**
 * Must match the boot script in index.html and the CHECK constraint on
 * `gyms.primary_color`. A value that fails this goes straight into
 * `style.setProperty`, so treating it as untrusted input is not optional.
 */
export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function readBrandingCache(): Branding | null {
  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY);
    if (!raw) return null;
    const b = JSON.parse(raw);
    if (!b || typeof b.primaryColor !== 'string' || !HEX_RE.test(b.primaryColor)) {
      return null;
    }
    return {
      businessName: b.businessName || DEFAULT_BRANDING.businessName,
      logoUrl: b.logoUrl ?? null,
      primaryColor: b.primaryColor,
    };
  } catch {
    return null;
  }
}

export function writeBrandingCache(branding: Branding): void {
  try {
    localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(branding));
  } catch {
    /* Private mode can throw on write. Losing the cache costs one flash. */
  }
}

/**
 * Call on logout. Without this, a member of Gym A signs out on a shared phone,
 * a member of Gym B signs in, and briefly sees Gym A's colour and name.
 */
export function clearBrandingCache(): void {
  try {
    localStorage.removeItem(BRANDING_STORAGE_KEY);
  } catch {
    /* Never block logout over storage. */
  }
}

/** Sets the one variable that drives every `brand-*` utility class. */
export function applyBrandColor(hex: string): void {
  document.documentElement.style.setProperty('--brand-base', hex);
}
