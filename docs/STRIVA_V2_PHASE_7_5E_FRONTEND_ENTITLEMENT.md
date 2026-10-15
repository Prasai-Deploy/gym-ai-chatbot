# STRIVA V2 — PHASE 7.5E: FRONTEND ENTITLEMENT & SUBSCRIPTION GATE LAYER

## Objective
Establish a clean, calm, and premium frontend subscription experience around STRIVA V2's authoritative server-side entitlement API (`GET /api/v1/billing/status`).

Core Principles:
1. **Frontend gates are UX; backend middleware remains security authority**: No client tampering or local bypass can grant access to server-protected endpoints.
2. **Zero client-side date/tier speculation**: Subscription status, trial days remaining, and access decisions are derived strictly from the backend response.
3. **Calm, dark-first premium design**: No SaaS noise, flashing banners, aggressive countdown timers, or neon overload.
4. **Uninterrupted account ownership**: Expired users never lose access to Profile, Billing, Account Settings, or Logout, and are never trapped in redirect loops.

---

## Frontend Entitlement Architecture

```
                          ┌────────────────────────────────┐
                          │    Authoritative Backend API   │
                          │   GET /api/v1/billing/status   │
                          └───────────────┬────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │   src/api/entitlementApi.ts     │
                         └────────────────┬────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │   src/hooks/useEntitlement.ts   │
                         │    TanStack Query (60s stale)   │
                         └───────┬─────────────────┬───────┘
                                 │                 │
                ┌────────────────┴─┐             ┌─┴────────────────┐
                │                  │             │                  │
                ▼                  ▼             ▼                  ▼
      ┌──────────────────┐ ┌───────────────┐ ┌───────────────┐ ┌──────────────────┐
      │TrialCountdown-   │ │Protected Pages│ │  Home Page    │ │Unprotected Pages │
      │Banner (AppShell) │ │(Coach,Workout,│ │  (Dashboard)  │ │(Profile, Billing)│
      │                  │ │Nutrition,Prog)│ │               │ │                  │
      └──────────────────┘ └───────┬───────┘ └───────┬───────┘ └────────┬─────────┘
                                   │                 │                  │
                                   ▼                 ▼                  ▼
                         ┌───────────────────────────────────┐ ┌──────────────────┐
                         │    SubscriptionRequired UX Gate   │ │  Always Accessible│
                         │    (Calm lock, plans CTA, no loop)│ │  (Account owners)│
                         └───────────────────────────────────┘ └──────────────────┘
```

---

## useEntitlement

Located at `src/hooks/useEntitlement.ts`.
- **Query Key**: `['entitlement', 'status']` (stable query key).
- **Stale Time**: 60 seconds (`staleTime: 60 * 1000`).
- **Refetch Behavior**: `refetchOnWindowFocus: true`, `retry: 1`.
- **Authentication Guard**: `enabled: !!user && !authLoading` via `useAuth()`.
- **Authoritative Properties**:
  - `state`: `'DEMO' | 'TRIAL' | 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED' | 'CANCELLED'`
  - `hasAccess`: `boolean`
  - `daysRemaining`: `number` (derived directly from server, 0 when expired)
  - `trialEndsAt`: `string | null`
  - `currentPeriodEnd`: `string | null`
  - `tier`: `string`
  - `status`: `string`
  - `cancelAtPeriodEnd`: `boolean`
  - `limits`: `EntitlementLimits`
  - `loading`: `boolean` (prevents premature lock flash while query resolves)
  - `error`: `Error | null`
  - `refetch`: Query invalidation trigger
- **Helper Flags**:
  - `isTrial`: `state === 'TRIAL'`
  - `isActive`: `state === 'ACTIVE'`
  - `isGracePeriod`: `state === 'GRACE_PERIOD'`
  - `isExpired`: `state === 'EXPIRED'`
  - `isCancelled`: `state === 'CANCELLED'`
  - `isDemo`: `state === 'DEMO'`
- **Fail-Closed Security Default**: When query errors or user is unauthenticated, defaults strictly to `hasAccess: false, state: 'EXPIRED'`.

---

## Billing Status API

Located at `src/api/entitlementApi.ts`:
- Consumes authoritative backend endpoint: `GET /api/v1/billing/status`.
- Automatically supplies authenticated Supabase JWT via `httpClient.ts`.
- Handles both direct payload and wrapped `{ success: true, data: { ... } }` response formats.
- Never mocks fallback data on network failure; errors propagate to `useEntitlement` to ensure access is denied.

---

## Trial UX

- **State**: `state === 'TRIAL'`, `hasAccess === true`.
- **Experience**: Full access across Coach, Workout, Nutrition, Progress, and Dashboard.
- **Trial Countdown Banner**:
  - Mounted directly beneath `TopNavigation` inside `AppShell.tsx`.
  - Dark-first, compact, responsive, calm: `#11141C` background with subtle slate border.
  - Presentation: `"Your STRIVA trial ends in X days."` (`"ends tomorrow"` / `"ends today"` when `daysRemaining <= 1`).
  - Actions:
    - Primary CTA: `"View plans"` leading to `/pricing`.
    - Dismiss control: Non-destructive close icon allowing the user to dismiss the banner for their immediate session without hiding billing info.
  - Automatically hidden on billing/checkout/admin routes.

---

## Active Paid UX

- **State**: `state === 'ACTIVE'`, `hasAccess === true`.
- **Experience**: Complete access across the STRIVA product suite.
- **Banner Behavior**: No trial countdown banner is rendered.
- **Navigation Identity**: Dynamic tier display in `MemberLayout` (`"PRO Member"`, `"ELITE Member"`) rather than static strings.

---

## Grace Period UX

- **State**: `state === 'GRACE_PERIOD'`, `hasAccess === true`.
- **Experience**: Full access retained during the grace window.
- **Banner Behavior**:
  - Non-dismissible amber warning banner in `AppShell.tsx`.
  - Presentation: `"Your payment needs attention. Your STRIVA access remains active during this grace period."`
  - Action: `"Update billing"` leading to `/v3/billing`.
  - Never prematurely locks the athlete out or displays a false expired state.

---

## Expired UX

- **State**: `state === 'EXPIRED'`, `hasAccess === false`.
- **Experience**:
  - Retains persistent access to `AppShell`, `Sidebar`, `TopNavigation`, and `MobileBottomNav`.
  - Retains full access to `/v3/profile`, `/v3/billing`, and account settings.
  - Protected routes (`/v3/coach`, `/v3/workout`, `/v3/nutrition`, `/v3/progress`) render the canonical `<SubscriptionRequired />` component.
  - Presentation:
    - Title: `"Your STRIVA trial has ended"`
    - Explanation: `"Start your STRIVA subscription to continue using Coach, Workout, Nutrition, and Progress."`
    - Action 1: `"View plans"` (navigates to `/pricing` / member billing).
    - Action 2: `"Go to Profile"` (navigates to `/v3/profile`).
    - Note: `"Your profile, workout history, and billing records remain fully accessible in your account."`
  - Never flashes a blank screen, never traps the user in redirect loops, and never redirects an authenticated user to `/login`.

---

## Demo UX

- **State**: `state === 'DEMO'`, `hasAccess === true`.
- **Experience**:
  - Sandbox access to all core features.
  - Does NOT display commercial trial banners or countdown warnings.
  - Does NOT show payment prompts implying the demo user owes money.

---

## Protected Routes

The canonical fitness feature routes are protected via server-authoritative entitlement UX gating:
- `/v3/coach`
- `/v3/workout`
- `/v3/nutrition`
- `/v3/progress`

Gate implementation:
1. Validates `useEntitlement()`. If `!hasAccess && (state === 'EXPIRED' || state === 'CANCELLED')`, renders `<SubscriptionRequired featureName="..." />`.
2. Intercepts HTTP 403 `SUBSCRIPTION_REQUIRED` errors from domain queries and renders `<SubscriptionRequired />` dynamically.
3. Server-side middleware (`entitlement.middleware.ts`) remains the authoritative enforcement point.

---

## Unprotected Routes

The following routes remain completely accessible to expired users:
- `/v3/profile` (Account details, session management, logout)
- `/v3/billing` (Member subscription status, invoices, plans)
- `/pricing` (Subscription plans and checkout entry)
- `/checkout/success` & `/checkout/cancel`
- `/v3/dashboard` (Shows clean SubscriptionRequired state instead of breaking or crashing)

---

## TRINETRA UX

- **Trial/Active/Grace**: Full interactive guidance and streaming SSE conversation execution.
- **Demo**: Sandbox Coach interaction.
- **Expired**:
  - Protected from invoking streaming sessions.
  - Displays `<SubscriptionRequired featureName="TRINETRA AI Coach" />`.
  - SSE stream responses returning 403 `SUBSCRIPTION_REQUIRED` are parsed into structured errors and transition UI to `SubscriptionRequired`.

---

## Workout UX

- **Expired User**: Protected against showing unusable empty states or fake data.
- **Gate**: Renders `<SubscriptionRequired featureName="Workout Execution" />`.
- **API Error**: If `/workouts/today` returns HTTP 403 `SUBSCRIPTION_REQUIRED`, recognized and gated cleanly.

---

## Nutrition UX

- **Expired User**: Displays `<SubscriptionRequired featureName="Nutrition & Metabolism" />`.
- **API Error**: If `/nutrition/daily` returns HTTP 403 `SUBSCRIPTION_REQUIRED`, recognized and gated cleanly without mock data fallback.

---

## Progress UX

- **Expired User**: Displays `<SubscriptionRequired featureName="Progress & Biometrics" />`.
- **API Error**: If `/progress/statistics` returns HTTP 403 `SUBSCRIPTION_REQUIRED`, recognized and gated cleanly without mock data fallback.

---

## Error Handling

Centralized in `src/utils/errorUtils.ts`:
- Exported helper: `isSubscriptionRequiredError(error: unknown): boolean`.
- Checks:
  - `error.code === 'SUBSCRIPTION_REQUIRED'`
  - `error.response?.data?.error?.code === 'SUBSCRIPTION_REQUIRED'`
  - `error.data?.error?.code === 'SUBSCRIPTION_REQUIRED'`
- **Critical Distinction**: Generic HTTP 403 errors (such as `RBAC_ACCESS_DENIED`, `TENANT_ACCESS_DENIED`, or resource authorization failures) are strictly NOT treated as subscription expiration.

---

## Checkout Handling

Updated in `src/features/billing/pages/CheckoutSuccessPage.tsx`:
- Removed legacy client-side `billingApi.updateSubscription(tier, interval)` call.
- Client NEVER locally sets `hasAccess = true` or `tier = pro`.
- Refetches authoritative status via `entitlementApi.getStatus()` and invalidates `ENTITLEMENT_QUERY_KEY`.
- If payment is synchronizing via Razorpay webhook, displays `"Payment Processing: Synchronizing your subscription with STRIVA authorization services..."` with a `"Re-check Subscription Status"` retry CTA.

---

## Responsive Verification

Verified across viewport breakpoints:
- **1440px / 1280px / 1024px** (Desktop): Trial countdown banner spans sub-header cleanly; `SubscriptionRequired` card is centered with generous whitespace.
- **768px** (Tablet): Banner flex-wraps neatly without clipping; sidebar collapses cleanly.
- **430px / 390px / 375px** (Mobile): MobileBottomNav remains completely functional; no horizontal scrollbar; CTAs stack cleanly; safe-area insets preserved.

---

## Accessibility Verification

- Semantic `<aside aria-label="Trial countdown">` and `<aside aria-label="Payment warning">` landmarks.
- Visible focus rings with high-contrast outlines on all buttons and dismiss controls.
- Screen-reader friendly message hierarchy.
- Color is not the sole conveyor of information (clear text labels "ends in X days", "Payment needs attention", "Your trial has ended").

---

## Tests

Complete automated suite in `backend/tests/unit/frontend_entitlement.unit.test.ts` (20 of 20 tests passing):
- **TEST 1**: Authenticated user with TRIAL sees full feature access.
- **TEST 2**: TRIAL shows trial countdown.
- **TEST 3**: ACTIVE does not show trial countdown.
- **TEST 4**: GRACE_PERIOD shows payment warning while retaining access.
- **TEST 5**: EXPIRED shows subscription-required state.
- **TEST 6**: EXPIRED can still access Profile.
- **TEST 7**: EXPIRED can still access Billing.
- **TEST 8**: EXPIRED cannot access Coach UX.
- **TEST 9**: EXPIRED cannot access Workout UX.
- **TEST 10**: EXPIRED cannot access Nutrition UX.
- **TEST 11**: EXPIRED cannot access Progress UX.
- **TEST 12**: DEMO does not show commercial trial countdown.
- **TEST 13**: DEMO retains sandbox access.
- **TEST 14**: 403 SUBSCRIPTION_REQUIRED is recognized correctly.
- **TEST 15**: Generic 403 is NOT treated as subscription expiration.
- **TEST 16**: Checkout success does not locally grant access.
- **TEST 17**: Billing status refetch updates entitlement state.
- **TEST 18**: Loading state does not flash expired UI.
- **TEST 19**: Network failure does not grant access.
- **TEST 20**: Expired user does not get trapped in redirect loop.

Overall test suite status:
- Total backend & unit test files: 18 passed (18)
- Total tests passed: 226 passed (226)

---

## Build

- Frontend Build: `npm run build:frontend` — Vite built successfully with 0 errors.
- Backend Build: `npm run build:backend` — `tsc && tsc-alias` compiled successfully with 0 errors.

---

## Known Limitations

1. **Pricing Page Plans**: `PricingPage.tsx` currently displays legacy Pro/Elite tiers at INR 799/1999. In Phase 7.5F, commercial pricing will be finalized and updated.
2. **B2B Admin Billing**: Gym Owner financial accounting remains accessible at `/admin/billing`, while `/v3/billing` is now dedicated to the Member B2C billing dashboard.

---

## Phase 7.5F Requirements

1. Finalize single consumer membership pricing (e.g. STRIVA Monthly / Annual membership).
2. Update `PricingPage.tsx` plan selection and Razorpay checkout amounts to canonical commercial price points.
3. Clean up legacy free/pro/elite multi-tier selection on consumer checkout surfaces.

---

## Files Created

- `src/api/entitlementApi.ts`
- `src/hooks/useEntitlement.ts`
- `src/utils/errorUtils.ts`
- `src/design-system/billing/TrialCountdownBanner.tsx`
- `src/design-system/billing/SubscriptionRequired.tsx`
- `backend/tests/unit/frontend_entitlement.unit.test.ts`
- `docs/STRIVA_V2_PHASE_7_5E_FRONTEND_ENTITLEMENT.md`

## Files Modified

- `src/api/httpClient.ts`
- `src/api/coachApi.ts`
- `src/design-system/billing/index.ts`
- `src/design-system/shell/AppShell.tsx`
- `src/layouts/MemberLayout.tsx`
- `src/features/billing/pages/CheckoutSuccessPage.tsx`
- `src/features/coach/hooks/useTrinetraCoach.ts`
- `src/v3/pages/V3BillingPage.tsx`
- `src/v3/pages/V3CoachPage.tsx`
- `src/v3/pages/V3WorkoutPage.tsx`
- `src/v3/pages/V3NutritionPage.tsx`
- `src/v3/pages/V3ProgressPage.tsx`
- `src/v3/pages/V3DashboardPage.tsx`

## Files Deleted

None.

---

## Explicit Phase Status Confirmation

- **Phase 7.5E**: COMPLETE
- **Phase 7.5F**: NOT STARTED
- **Phase 7.5G**: NOT STARTED
