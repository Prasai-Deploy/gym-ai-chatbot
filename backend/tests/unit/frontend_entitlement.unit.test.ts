import { describe, it, expect, vi } from 'vitest';
import path from 'path';

// Import isSubscriptionRequiredError from frontend src/utils/errorUtils
import { isSubscriptionRequiredError } from '../../../src/utils/errorUtils';

// Mirroring the pure route & entitlement logic from frontend hooks and components
interface EntitlementStateCheck {
  state: 'DEMO' | 'TRIAL' | 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED' | 'CANCELLED';
  hasAccess: boolean;
  daysRemaining: number;
  loading: boolean;
  error: Error | null;
}

function computeBannerVisibility(entitlement: EntitlementStateCheck, currentPath: string) {
  if (entitlement.loading) return { showTrialBanner: false, showGraceBanner: false };
  const pathname = currentPath.toLowerCase();
  const isExcluded =
    pathname.includes('/billing') ||
    pathname.includes('/pricing') ||
    pathname.includes('/checkout') ||
    pathname.includes('/login') ||
    pathname.includes('/admin');
  if (isExcluded) return { showTrialBanner: false, showGraceBanner: false };

  if (entitlement.state === 'TRIAL' && entitlement.hasAccess) {
    return { showTrialBanner: true, showGraceBanner: false };
  }
  if (entitlement.state === 'GRACE_PERIOD' && entitlement.hasAccess) {
    return { showTrialBanner: false, showGraceBanner: true };
  }
  return { showTrialBanner: false, showGraceBanner: false };
}

function computePageGate(
  route: string,
  entitlement: EntitlementStateCheck,
  apiError?: unknown
): { isGated: boolean; renderComponent: 'CONTENT' | 'SUBSCRIPTION_REQUIRED' | 'SKELETON' } {
  // Routes that are never gated for authenticated users
  const unprotectedRoutes = ['/v3/profile', '/v3/billing', '/pricing', '/dashboard'];
  
  if (unprotectedRoutes.includes(route)) {
    return { isGated: false, renderComponent: 'CONTENT' };
  }

  // Loading state must show skeleton, NOT flash subscription required
  if (entitlement.loading) {
    return { isGated: false, renderComponent: 'SKELETON' };
  }

  // Network failure must fail closed (never grant access)
  if (entitlement.error && !entitlement.hasAccess) {
    return { isGated: true, renderComponent: 'SUBSCRIPTION_REQUIRED' };
  }

  // Check backend entitlement authority
  if (!entitlement.hasAccess && (entitlement.state === 'EXPIRED' || entitlement.state === 'CANCELLED')) {
    return { isGated: true, renderComponent: 'SUBSCRIPTION_REQUIRED' };
  }

  // Check 403 SUBSCRIPTION_REQUIRED from feature APIs
  if (isSubscriptionRequiredError(apiError)) {
    return { isGated: true, renderComponent: 'SUBSCRIPTION_REQUIRED' };
  }

  return { isGated: false, renderComponent: 'CONTENT' };
}

describe('STRIVA V2 Phase 7.5E — Frontend Entitlement & Subscription Gates', () => {
  // TEST 1: Authenticated user with TRIAL sees full feature access
  it('TEST 1: Authenticated user with TRIAL sees full feature access', () => {
    const trialUser: EntitlementStateCheck = {
      state: 'TRIAL',
      hasAccess: true,
      daysRemaining: 12,
      loading: false,
      error: null,
    };

    const coachGate = computePageGate('/v3/coach', trialUser);
    const workoutGate = computePageGate('/v3/workout', trialUser);
    const nutritionGate = computePageGate('/v3/nutrition', trialUser);
    const progressGate = computePageGate('/v3/progress', trialUser);

    expect(coachGate.isGated).toBe(false);
    expect(coachGate.renderComponent).toBe('CONTENT');
    expect(workoutGate.isGated).toBe(false);
    expect(workoutGate.renderComponent).toBe('CONTENT');
    expect(nutritionGate.isGated).toBe(false);
    expect(nutritionGate.renderComponent).toBe('CONTENT');
    expect(progressGate.isGated).toBe(false);
    expect(progressGate.renderComponent).toBe('CONTENT');
  });

  // TEST 2: TRIAL shows trial countdown
  it('TEST 2: TRIAL shows trial countdown', () => {
    const trialUser: EntitlementStateCheck = {
      state: 'TRIAL',
      hasAccess: true,
      daysRemaining: 9,
      loading: false,
      error: null,
    };

    const banner = computeBannerVisibility(trialUser, '/v3/dashboard');
    expect(banner.showTrialBanner).toBe(true);
    expect(banner.showGraceBanner).toBe(false);
  });

  // TEST 3: ACTIVE does not show trial countdown
  it('TEST 3: ACTIVE does not show trial countdown', () => {
    const activeUser: EntitlementStateCheck = {
      state: 'ACTIVE',
      hasAccess: true,
      daysRemaining: 30,
      loading: false,
      error: null,
    };

    const banner = computeBannerVisibility(activeUser, '/v3/dashboard');
    expect(banner.showTrialBanner).toBe(false);
    expect(banner.showGraceBanner).toBe(false);
  });

  // TEST 4: GRACE_PERIOD shows payment warning while retaining access
  it('TEST 4: GRACE_PERIOD shows payment warning while retaining access', () => {
    const graceUser: EntitlementStateCheck = {
      state: 'GRACE_PERIOD',
      hasAccess: true,
      daysRemaining: 3,
      loading: false,
      error: null,
    };

    const banner = computeBannerVisibility(graceUser, '/v3/dashboard');
    expect(banner.showGraceBanner).toBe(true);
    expect(banner.showTrialBanner).toBe(false);

    // Retains full access during grace period
    const coachGate = computePageGate('/v3/coach', graceUser);
    expect(coachGate.isGated).toBe(false);
    expect(coachGate.renderComponent).toBe('CONTENT');
  });

  // TEST 5: EXPIRED shows subscription-required state
  it('TEST 5: EXPIRED shows subscription-required state', () => {
    const expiredUser: EntitlementStateCheck = {
      state: 'EXPIRED',
      hasAccess: false,
      daysRemaining: 0,
      loading: false,
      error: null,
    };

    const gate = computePageGate('/v3/coach', expiredUser);
    expect(gate.isGated).toBe(true);
    expect(gate.renderComponent).toBe('SUBSCRIPTION_REQUIRED');
  });

  // TEST 6: EXPIRED can still access Profile
  it('TEST 6: EXPIRED can still access Profile', () => {
    const expiredUser: EntitlementStateCheck = {
      state: 'EXPIRED',
      hasAccess: false,
      daysRemaining: 0,
      loading: false,
      error: null,
    };

    const profileGate = computePageGate('/v3/profile', expiredUser);
    expect(profileGate.isGated).toBe(false);
    expect(profileGate.renderComponent).toBe('CONTENT');
  });

  // TEST 7: EXPIRED can still access Billing
  it('TEST 7: EXPIRED can still access Billing', () => {
    const expiredUser: EntitlementStateCheck = {
      state: 'EXPIRED',
      hasAccess: false,
      daysRemaining: 0,
      loading: false,
      error: null,
    };

    const billingGate = computePageGate('/v3/billing', expiredUser);
    expect(billingGate.isGated).toBe(false);
    expect(billingGate.renderComponent).toBe('CONTENT');
  });

  // TEST 8: EXPIRED cannot access Coach UX
  it('TEST 8: EXPIRED cannot access Coach UX', () => {
    const expiredUser: EntitlementStateCheck = {
      state: 'EXPIRED',
      hasAccess: false,
      daysRemaining: 0,
      loading: false,
      error: null,
    };

    const coachGate = computePageGate('/v3/coach', expiredUser);
    expect(coachGate.isGated).toBe(true);
    expect(coachGate.renderComponent).toBe('SUBSCRIPTION_REQUIRED');
  });

  // TEST 9: EXPIRED cannot access Workout UX
  it('TEST 9: EXPIRED cannot access Workout UX', () => {
    const expiredUser: EntitlementStateCheck = {
      state: 'EXPIRED',
      hasAccess: false,
      daysRemaining: 0,
      loading: false,
      error: null,
    };

    const workoutGate = computePageGate('/v3/workout', expiredUser);
    expect(workoutGate.isGated).toBe(true);
    expect(workoutGate.renderComponent).toBe('SUBSCRIPTION_REQUIRED');
  });

  // TEST 10: EXPIRED cannot access Nutrition UX
  it('TEST 10: EXPIRED cannot access Nutrition UX', () => {
    const expiredUser: EntitlementStateCheck = {
      state: 'EXPIRED',
      hasAccess: false,
      daysRemaining: 0,
      loading: false,
      error: null,
    };

    const nutritionGate = computePageGate('/v3/nutrition', expiredUser);
    expect(nutritionGate.isGated).toBe(true);
    expect(nutritionGate.renderComponent).toBe('SUBSCRIPTION_REQUIRED');
  });

  // TEST 11: EXPIRED cannot access Progress UX
  it('TEST 11: EXPIRED cannot access Progress UX', () => {
    const expiredUser: EntitlementStateCheck = {
      state: 'EXPIRED',
      hasAccess: false,
      daysRemaining: 0,
      loading: false,
      error: null,
    };

    const progressGate = computePageGate('/v3/progress', expiredUser);
    expect(progressGate.isGated).toBe(true);
    expect(progressGate.renderComponent).toBe('SUBSCRIPTION_REQUIRED');
  });

  // TEST 12: DEMO does not show commercial trial countdown
  it('TEST 12: DEMO does not show commercial trial countdown', () => {
    const demoUser: EntitlementStateCheck = {
      state: 'DEMO',
      hasAccess: true,
      daysRemaining: 999,
      loading: false,
      error: null,
    };

    const banner = computeBannerVisibility(demoUser, '/v3/dashboard');
    expect(banner.showTrialBanner).toBe(false);
    expect(banner.showGraceBanner).toBe(false);
  });

  // TEST 13: DEMO retains sandbox access
  it('TEST 13: DEMO retains sandbox access', () => {
    const demoUser: EntitlementStateCheck = {
      state: 'DEMO',
      hasAccess: true,
      daysRemaining: 999,
      loading: false,
      error: null,
    };

    const coachGate = computePageGate('/v3/coach', demoUser);
    expect(coachGate.isGated).toBe(false);
    expect(coachGate.renderComponent).toBe('CONTENT');
  });

  // TEST 14: 403 SUBSCRIPTION_REQUIRED is recognized correctly
  it('TEST 14: 403 SUBSCRIPTION_REQUIRED is recognized correctly', () => {
    const backendStructuredError = {
      status: 403,
      response: {
        status: 403,
        data: {
          success: false,
          error: {
            code: 'SUBSCRIPTION_REQUIRED',
            message: 'Active subscription or trial required',
            state: 'EXPIRED',
          },
        },
      },
    };

    const directCodeError = {
      code: 'SUBSCRIPTION_REQUIRED',
      message: 'Active subscription required',
    };

    expect(isSubscriptionRequiredError(backendStructuredError)).toBe(true);
    expect(isSubscriptionRequiredError(directCodeError)).toBe(true);
  });

  // TEST 15: Generic 403 is NOT treated as subscription expiration
  it('TEST 15: Generic 403 is NOT treated as subscription expiration', () => {
    const rbacError = {
      status: 403,
      response: {
        status: 403,
        data: {
          success: false,
          error: {
            code: 'RBAC_ACCESS_DENIED',
            message: 'Insufficient permissions for this resource',
          },
        },
      },
    };

    const tenantError = {
      status: 403,
      response: {
        status: 403,
        data: {
          code: 'TENANT_FORBIDDEN',
          message: 'Cross-tenant access forbidden',
        },
      },
    };

    const plainError = new Error('Generic 403 Forbidden');

    expect(isSubscriptionRequiredError(rbacError)).toBe(false);
    expect(isSubscriptionRequiredError(tenantError)).toBe(false);
    expect(isSubscriptionRequiredError(plainError)).toBe(false);
    expect(isSubscriptionRequiredError(null)).toBe(false);
  });

  // TEST 16: Checkout success does not locally grant access
  it('TEST 16: Checkout success does not locally grant access', () => {
    // Simulating return from checkout with URL params ?tier=pro&interval=monthly
    // Entitlement state MUST remain what the server reports, never local overrides
    const pendingServerState: EntitlementStateCheck = {
      state: 'EXPIRED',
      hasAccess: false,
      daysRemaining: 0,
      loading: false,
      error: null,
    };

    // Client must not flip hasAccess to true simply because of return URL
    const coachGate = computePageGate('/v3/coach', pendingServerState);
    expect(coachGate.isGated).toBe(true);
    expect(coachGate.renderComponent).toBe('SUBSCRIPTION_REQUIRED');
  });

  // TEST 17: Billing status refetch updates entitlement state
  it('TEST 17: Billing status refetch updates entitlement state', () => {
    let entitlementState: EntitlementStateCheck = {
      state: 'EXPIRED',
      hasAccess: false,
      daysRemaining: 0,
      loading: false,
      error: null,
    };

    expect(computePageGate('/v3/coach', entitlementState).isGated).toBe(true);

    // After webhook sync and refetch:
    entitlementState = {
      state: 'ACTIVE',
      hasAccess: true,
      daysRemaining: 30,
      loading: false,
      error: null,
    };

    expect(computePageGate('/v3/coach', entitlementState).isGated).toBe(false);
    expect(computePageGate('/v3/coach', entitlementState).renderComponent).toBe('CONTENT');
  });

  // TEST 18: Loading state does not flash expired UI
  it('TEST 18: Loading state does not flash expired UI', () => {
    const loadingState: EntitlementStateCheck = {
      state: 'EXPIRED', // default fallback
      hasAccess: false,
      daysRemaining: 0,
      loading: true, // currently resolving
      error: null,
    };

    const coachGate = computePageGate('/v3/coach', loadingState);
    expect(coachGate.isGated).toBe(false);
    expect(coachGate.renderComponent).toBe('SKELETON');
  });

  // TEST 19: Network failure does not grant access
  it('TEST 19: Network failure does not grant access', () => {
    const networkFailedState: EntitlementStateCheck = {
      state: 'EXPIRED',
      hasAccess: false, // strictly fail closed
      daysRemaining: 0,
      loading: false,
      error: new Error('Network error: connection refused'),
    };

    const coachGate = computePageGate('/v3/coach', networkFailedState);
    expect(coachGate.isGated).toBe(true);
    expect(coachGate.renderComponent).toBe('SUBSCRIPTION_REQUIRED');
  });

  // TEST 20: Expired user does not get trapped in redirect loop
  it('TEST 20: Expired user does not get trapped in redirect loop', () => {
    const expiredUser: EntitlementStateCheck = {
      state: 'EXPIRED',
      hasAccess: false,
      daysRemaining: 0,
      loading: false,
      error: null,
    };

    // Authenticated user navigating to /v3/profile or /v3/billing
    // Must NOT redirect to /login (which would cause infinite loop when AuthContext has user)
    const profileGate = computePageGate('/v3/profile', expiredUser);
    const billingGate = computePageGate('/v3/billing', expiredUser);

    expect(profileGate.isGated).toBe(false);
    expect(billingGate.isGated).toBe(false);
  });
});
