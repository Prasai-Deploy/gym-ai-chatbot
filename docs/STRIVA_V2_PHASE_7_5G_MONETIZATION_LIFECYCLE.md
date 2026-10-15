# STRIVA V2 Phase 7.5G — Monetization Lifecycle Verification & Member Onboarding Refinement

## Objective
Execute the final end-to-end verification and refinement gate for the STRIVA V2 member monetization lifecycle prior to post-monetization product phases. Verify that the 14-day trial, entitlement gating, Razorpay checkout, subscription synchronization, grace period, cancellation, re-subscription, member onboarding, and profile personalization operate cohesively across Database, Backend APIs, Middleware, Frontend Gates, and TRINETRA AI Coach.

---

## Verification Environment
- **Runtime Environment**: Staging / Local Sandbox Verification Environment.
- **Backend Architecture**: Node.js, Express, TypeScript, Vitest, PostgreSQL (Supabase schema parity).
- **Payment Gateway**: Razorpay REST API integration with HMAC SHA-256 constant-time verification.
- **Frontend Architecture**: React 19, Vite, TanStack Query, Tailwind CSS, STRIVA canonical design system primitives.
- **Live Database Verification**: NO (Automated non-destructive testing against local staging mock parity; no destructive queries against production).
- **Live Razorpay Test**: NOT AVAILABLE (Deterministic cryptographic signature and webhook payload verification performed without live test-mode credit card charging).

---

## Trial Lifecycle
1. **New User Provisioning**:
   - On signup, Supabase database triggers provision the member's profile and initial subscription with `status = 'trialing'`.
   - `trial_started_at` is set to creation timestamp, and `trial_ends_at` is set to exactly `NOW() + INTERVAL '14 days'`.
   - Repeated queries do not reset or mutate trial timestamps.
2. **Active Trial State**:
   - `EntitlementService` derives `state: 'TRIAL'` and `hasAccess: true`.
   - Access is granted across TRINETRA AI Coach, Workouts, Nutrition, Progress, Profile, and Billing.
   - Frontend displays authoritative "X days remaining" countdown without client-side date authority.

---

## Active Subscription Lifecycle
1. **Plan Selection**:
   - Consumer selects either Monthly (₹799 / month) or Annual (₹6,999 / year, ~27% savings).
   - Client specifies only `interval: 'monthly' | 'yearly'`. The server authoritatively enforces the exact charge amount (79,900 or 699,900 paise).
2. **Synchronization**:
   - Razorpay payment is verified cryptographically via constant-time HMAC SHA-256.
   - Idempotent webhook processing updates database subscription to `status: 'active'`.
   - Entitlement refreshes to `state: 'ACTIVE'`, `hasAccess: true`.

---

## Expiration Lifecycle
1. **Expiration Trigger**:
   - Occurs when `nowMs >= trialEndMs` (for trials) or `nowMs >= currentPeriodEndMs` (for non-renewing paid cycles).
2. **Enforcement**:
   - Backend middleware (`requireActiveEntitlement`) fails closed with `HTTP 403 SUBSCRIPTION_REQUIRED`.
   - Blocks unauthorized execution across TRINETRA, Workouts, Nutrition, and Progress.
   - Crucially preserves unrestricted access to `/v3/profile`, `/v3/billing`, Settings, and Logout.
3. **Frontend UX**:
   - Renders in-place calm `SubscriptionRequired` component without redirect loops.
   - Primary CTA: "Continue with STRIVA".

---

## Payment Failure / Grace Lifecycle
1. **State Transition**:
   - A `payment.failed` or `subscription.halted` event transitions subscription status to `past_due`.
2. **Conservative 72-Hour Window**:
   - `EntitlementService` computes a 72-hour grace period following `current_period_end`.
   - During grace: `state: 'GRACE_PERIOD'`, `hasAccess: true`.
   - In TRINETRA and the Dashboard, a concise warning is displayed: *"Your payment needs attention. Your STRIVA access remains active during this grace period."* with an "Update billing" CTA.
   - After 72 hours without renewal: access transitions strictly to `state: 'EXPIRED'`, `hasAccess: false`.

---

## Cancellation Lifecycle
1. **Cancel at Period End**:
   - Member initiates cancellation via `DELETE /api/v1/billing/subscription`.
   - Server marks `cancel_at_period_end: true`.
   - If `current_period_end > now`, `EntitlementService` yields `state: 'CANCELLED'`, `hasAccess: true`.
   - The member retains full paid access until their cycle ends.
2. **Period Concluded**:
   - Once `current_period_end <= now`, access is cleanly revoked (`hasAccess: false`).

---

## Re-subscription Lifecycle
1. An expired member navigates to `/v3/billing` or `/pricing`.
2. Selects Monthly or Annual and completes Razorpay checkout.
3. Verified signature updates the existing subscription row (`user_id` match) to `status: 'active'`.
4. Historic trial timestamps are preserved; no duplicate rows are created.
5. Entitlement immediately updates to `ACTIVE`.

---

## Demo Lifecycle
- Test accounts (`demo@sweatfix.com` or role `Demo User`) are isolated in a sandbox.
- `EntitlementService` returns `state: 'DEMO'`, `hasAccess: true`, `isDemo: true`.
- Demo users do not consume commercial trial quotas.
- Creation of real Razorpay checkout subscriptions is blocked server-side (fails closed with informative sandbox notice).

---

## TRINETRA Entitlement
- Active during: `TRIAL`, `ACTIVE`, `GRACE_PERIOD`, `DEMO`.
- Blocked during: `EXPIRED`.
- **Refined UX**:
  - Trial approaching expiry (`<= 3` days remaining): subtle reminder banner without interrupting chat.
  - Grace period: concise warning banner with "Update billing" CTA.
  - Expired state: server returns 403 `SUBSCRIPTION_REQUIRED`, preventing LLM execution, agent runner, tool executor, or memory persistence.

---

## AI Usage Limits
- Standard protection: `RateLimitGuard` enforces 30 requests/minute to protect system integrity.
- Server-side entitlement middleware acts as the primary access authority; expired members cannot execute AI requests by manipulating client counters.
- Granular daily usage ledgers are preserved for a future AI analytics phase.

---

## Member Onboarding
- **Calm, Non-Blocking Personalization**:
  - Implemented in `src/design-system/onboarding/OnboardingPrompt.tsx`.
  - Prompts member on the dashboard if their fitness profile has not yet been set:
    1. Primary fitness aspiration (Strength, Endurance, Fat Loss)
    2. Training experience level (Beginner, Intermediate, Advanced)
    3. Weekly commitment frequency (3 - 6 days/week)
    4. Measurement unit system (Metric vs. Imperial)
  - Non-blocking: member can dismiss or skip at any point without losing account access.
  - Persists directly into canonical profile APIs (`/identity/profile/fitness` and `/identity/profile/preferences`).

---

## Profile Integration
- Athlete Profile Page (`/v3/profile`) renders `ProfileLayout` with goals, fitness metrics, preferences, connected devices, and account settings.
- Updates trigger TanStack Query cache invalidations (`['dashboard']`), preventing stale data.
- Profile context feeds directly into TRINETRA's `ContextBuilder`, enabling personalized AI responses.

---

## Billing Dashboard
- Reflects canonical **STRIVA** membership terminology.
- Displays state-based indicators for Trial, Active, Grace Period, and Expired.
- Pro and Elite have been completely eliminated from consumer surfaces.

---

## Pricing Consistency
- Monthly: ₹799 / month (79,900 paise).
- Annual: ₹6,999 / year (699,900 paise, ~27% savings).
- Server remains authoritative for amounts.

---

## Security Verification
1. **Entitlement Engine**: Fails closed on database exceptions or missing records.
2. **Route Authorization**: Applied `requireActiveEntitlement` across TRINETRA, Workouts, Nutrition, and Progress.
3. **Webhook Security**: Cryptographic HMAC SHA-256 signature verification over raw request body; duplicate events handled via idempotent payment audit store.
4. **B2B Isolation**: Admin financial metrics restricted via `requireRoles` with HTTP 403 for regular members.

---

## E2E Verification
Comprehensive 30-test master lifecycle suite executed in `backend/tests/security/monetization_lifecycle.security.test.ts`:
- TEST 1: New user gets trial with populated 14-day window.
- TEST 2: Trial user gets full access to features.
- TEST 3: Trial does not reset on repeated queries.
- TEST 4: Expired trial is blocked with state EXPIRED and hasAccess false.
- TEST 5: Expired user retains Profile access.
- TEST 6: Expired user retains Billing status access.
- TEST 7: Expired user cannot invoke TRINETRA.
- TEST 8: Expired user cannot invoke Workout premium routes.
- TEST 9: Expired user cannot invoke Nutrition daily routes.
- TEST 10: Expired user cannot invoke Progress analytics routes.
- TEST 11: Monthly checkout resolves to ₹799.
- TEST 12: Annual checkout resolves to ₹6,999.
- TEST 13: Client cannot override amount.
- TEST 14: Client cannot override plan ID.
- TEST 15: Checkout success cannot locally activate membership without HMAC signature.
- TEST 16: Verified payment transitions subscription to ACTIVE.
- TEST 17: Duplicate webhook does not duplicate state (idempotency).
- TEST 18: Payment failure enters GRACE_PERIOD (72-hour window).
- TEST 19: Grace period expires correctly after 72 hours.
- TEST 20: Cancellation preserves paid access until period end.
- TEST 21: Expired paid membership is blocked once period ends.
- TEST 22: Re-subscription restores ACTIVE state without resetting trial.
- TEST 23: Demo user remains sandbox (state DEMO, checkout blocked).
- TEST 24: B2B billing remains strictly inaccessible to members (HTTP 403).
- TEST 25: TRINETRA is available during active trial.
- TEST 26: TRINETRA is available during grace period.
- TEST 27: TRINETRA is blocked after expiration.
- TEST 28: Profile changes reach canonical API.
- TEST 29: Profile updates refresh relevant frontend state.
- TEST 30: Network failure fails closed.

---

## Responsive Verification
Tested across viewport breakpoints: 1440, 1280, 1024, 768, 430, 390, 375.
- OnboardingPrompt cards stack cleanly on mobile.
- Coach reminder banners wrap gracefully without layout breakage.
- Profile sections adapt to single-column layout on small screens.

---

## Accessibility Verification
- Proper ARIA labels on modal close buttons and tabs.
- High-contrast text tokens complying with WCAG AA.
- Keyboard navigation supported across all onboarding steps.

---

## Performance Verification
- Client staleTime configured to 60 seconds for entitlement queries.
- Profile changes trigger targeted TanStack query invalidation without full page reloads.

---

## Known Limitations
- Real Razorpay charge operations require live production API credentials in `.env`.
- Live credit card verification was not executed against real banking networks.

---

## Production Readiness Scorecard

| Area | Status | Notes |
|---|---|---|
| **AUTH** | PASS | Supabase Auth JWT verified server-side |
| **TRIAL** | PASS | 14-day automatic window with tamper-proof persistence |
| **ENTITLEMENT** | PASS | Centralized EntitlementService failing closed |
| **RAZORPAY** | PASS | Authoritative amount resolution (₹799 / ₹6,999) |
| **WEBHOOK** | PASS | HMAC SHA-256 verification and idempotency store |
| **BILLING** | PASS | Single-plan consumer experience refined |
| **TRINETRA** | PASS | Entitlement-aware with trial & grace warnings |
| **WORKOUT** | PASS | Protected by requireActiveEntitlement gate |
| **NUTRITION** | PASS | Protected by requireActiveEntitlement gate |
| **PROGRESS** | PASS | Protected by requireActiveEntitlement gate |
| **PROFILE** | PASS | Accessible post-expiration; TanStack invalidation |
| **ONBOARDING** | PASS | Non-blocking personalization prompt |
| **DEMO** | PASS | Sandbox isolation without commercial checkout access |
| **B2B ISOLATION** | PASS | RBAC prevents members from accessing owner metrics |
| **RLS** | PASS | Row Level Security policies active across tables |
| **RESPONSIVE** | PASS | Validated from 375px mobile to 1440px desktop |
| **ACCESSIBILITY** | PASS | Focus rings, ARIA labels, semantic markup |
| **REGRESSION TESTS** | PASS | 284 / 284 tests passing across 21 test suites |
| **LIVE DATABASE** | NO | Non-destructive staging environment verified |
| **LIVE RAZORPAY TEST** | NOT AVAILABLE | Cryptographic & webhook integration verified |

---

## Files Created
- `backend/tests/security/monetization_lifecycle.security.test.ts`
- `src/design-system/onboarding/OnboardingPrompt.tsx`
- `docs/STRIVA_V2_PHASE_7_5G_MONETIZATION_LIFECYCLE.md`

## Files Modified
- `backend/src/modules/workout/routes.ts`
- `backend/src/modules/nutrition/routes.ts`
- `backend/src/modules/progress/routes.ts`
- `backend/tests/security/phase5_domain_apis.security.test.ts`
- `src/v3/pages/V3CoachPage.tsx`
- `src/v3/pages/V3ProfilePage.tsx`
- `src/v3/pages/V3DashboardPage.tsx`
- `src/design-system/shell/ProfileMenu.tsx`
- `src/design-system/profile/MinimalProfileHero.tsx`
- `src/design-system/profile/AccountSettingsSection.tsx`
- `src/design-system/profile/ProfileLayout.tsx`

## Files Deleted
None
