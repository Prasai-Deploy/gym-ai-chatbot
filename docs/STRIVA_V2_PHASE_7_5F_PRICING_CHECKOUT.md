# STRIVA V2 Phase 7.5F — Single-Plan Pricing & Razorpay Checkout Refinement

## Objective
Finalize the member-facing STRIVA consumer billing experience. Transition from the legacy multi-tier consumer pricing model (Free / Pro / Elite) to a single, premium consumer membership: **STRIVA**, backed by authoritative server-side pricing and hardened Razorpay checkout.

---

## Final Consumer Pricing
STRIVA operates under a single commercial consumer membership structure:

| Interval | Price | Equivalent Monthly | Savings |
|---|---|---|---|
| **Monthly** | ₹799 / month | ₹799 / month | Baseline |
| **Annual** | ₹6,999 / year | ~₹583 / month | ~27% savings |

*Annual savings calculation*:
$$(₹799 \times 12) - ₹6,999 = ₹9,588 - ₹6,999 = ₹2,589 \text{ saved } (\approx 27.0\%)$$

No additional GST or unconfigured tax rates are injected; all amounts strictly follow the authoritative server-side configuration.

---

## Single Plan Model
- **Plan Brand**: **STRIVA** ("Your AI-powered fitness operating system").
- **Tiers Removed from Consumer UI**: Pro and Elite are completely removed from customer-facing pricing and billing dashboards.
- **Included Features**:
  - TRINETRA AI Coach
  - Personalized workouts
  - Nutrition guidance
  - Progress tracking
  - Hydration tracking
  - Personalized fitness context/memory
  - AI-powered recommendations
  - Workout & nutrition logging
  - Progress insights

---

## Monthly Pricing
- Amount: ₹799 (79,900 paise in Razorpay transactions).
- Recurring interval: Monthly.
- Flexible commitment with cancel-at-period-end support.

---

## Annual Pricing
- Amount: ₹6,999 (699,900 paise in Razorpay transactions).
- Recurring interval: Annual / Yearly.
- Highlighted as "Best Value" (~27% discount over month-to-month billing).

---

## Trial Model
- **14-Day Free Trial**: All new consumers start with a 14-day full-access trial provisioned automatically on signup.
- **Messaging**: "Start with 14 days free. Continue with STRIVA for ₹799/month or ₹6,999/year."
- No upfront payment required to experience the trial.
- When the trial expires, the member is seamlessly directed to the refined STRIVA checkout to activate their ongoing membership.

---

## Razorpay Mapping
Razorpay plan identifiers are managed server-side and resolved according to the selected interval:
- **Monthly**: `RAZORPAY_PLAN_STRIVA_MONTHLY` (defaulting to `plan_striva_monthly`)
- **Annual**: `RAZORPAY_PLAN_STRIVA_YEARLY` (defaulting to `plan_striva_annual`)

### Dashboard Configuration Required (if using live plans)
When provisioning plans in the Razorpay Dashboard:
1. **STRIVA Monthly**:
   - Period: Monthly, Interval: 1
   - Amount: ₹799.00
   - Description: STRIVA Membership - Monthly
2. **STRIVA Annual**:
   - Period: Yearly, Interval: 1
   - Amount: ₹6,999.00
   - Description: STRIVA Membership - Annual

---

## Server-Side Pricing Authority
- The client request only transmits the billing interval (`monthly` or `yearly`).
- Any client-submitted `amount` or `plan_id` in the request body is strictly ignored.
- The server (`RazorpayProvider` and `BillingService`) resolves the authoritative amount in paise (`79900` or `699900`) and the canonical plan ID.
- Demo users (`demo@sweatfix.com` or role `Demo User`) operate in sandbox mode and are prevented from initiating real Razorpay sessions.

---

## Checkout Flow
1. Member clicks "Start 14-Day Free Trial" or "Continue with STRIVA" on `/pricing` or `/v3/billing`.
2. Client calls `POST /api/v1/billing/razorpay/checkout` with `{ interval: 'monthly' | 'yearly' }`.
3. Server validates authentication JWT, checks tenant/sandbox restrictions, resolves authoritative pricing, and creates a subscription session with Razorpay.
4. Client launches Razorpay Modal using the returned session ID, key ID, and canonical amount.
5. Member completes payment in the modal.

---

## Checkout Success
1. Following payment completion, client is redirected to `/v3/billing/success`.
2. The page does **NOT** self-activate membership via client state or query params.
3. Server receives either:
   - Webhook `subscription.charged` / `payment.captured` with valid HMAC-SHA256 signature, or
   - `POST /api/v1/billing/razorpay/verify` with valid constant-time HMAC signature.
4. The database subscription updates to `active`.
5. Frontend polls/refetches `GET /api/v1/billing/status`. Once the server reflects active status, the UI displays confirmed access.
6. If webhook synchronization is slightly delayed, the UI safely displays: *"Payment received. We're confirming your STRIVA membership..."* with a retry button.

---

## Checkout Cancellation
1. If the user dismisses the Razorpay checkout modal or navigates away, they arrive at `/v3/billing/cancel`.
2. No state is mutated on the server.
3. User is provided with a calm return path back to `/v3/billing` or `/pricing` without false error alarms.

---

## Billing Dashboard
The member billing dashboard (`/v3/billing`) presents clear state-based messaging:
- **Trial**: Displays "STRIVA Trial", countdown of days remaining, and an upgrade toggle to choose Monthly or Annual.
- **Active**: Displays "STRIVA Membership", current billing cadence ("₹799 / month" or "₹6,999 / year"), next renewal date, and manage/cancel options.
- **Grace Period**: Displays "Payment Needs Attention", keeping temporary access while prompting for renewal.
- **Expired**: Displays "Membership Required" with primary CTA "Continue with STRIVA".

---

## Legacy Tier Compatibility
- Historical database records with `tier: 'pro'` or `tier: 'elite'` are non-destructively preserved.
- The consumer UI maps all active paid subscriptions to **STRIVA Membership**.
- No active paying member is downgraded or cancelled due to the transition to the single-plan commercial model.

---

## B2B Separation
- Consumer member billing lives strictly at `/v3/billing` and `/pricing`.
- Gym Owner / Admin B2B billing lives at `/admin/billing`.
- The endpoint `GET /api/v1/billing/admin/metrics` is strictly guarded by `requireRoles(['Organization Owner', 'Gym Manager', 'Platform Super Admin', 'Gym Owner'])`, denying regular consumer members with `403 Forbidden`.

---

## Security Tests
17 automated security and integrity tests implemented in [single_plan_pricing.security.test.ts](file:///C:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/tests/security/single_plan_pricing.security.test.ts):
- TEST 1: Monthly request resolves to ₹799 (79900 paise).
- TEST 2: Annual request resolves to ₹6,999 (699900 paise).
- TEST 3: Client-provided amount is ignored; server enforces authoritative ₹799 / ₹6,999.
- TEST 4: Client cannot select arbitrary Razorpay plan ID.
- TEST 5: Client cannot set tier=elite/pro to alter pricing.
- TEST 6: Checkout requires authenticated user (fails closed with 401).
- TEST 7: Checkout uses server-derived user identity; client-supplied user_id is ignored.
- TEST 8: Checkout success cannot locally activate membership without verified signature.
- TEST 9: Verified payment can synchronize membership with constant-time HMAC.
- TEST 10: Unverified payment cannot activate membership.
- TEST 11: Canceled checkout does not alter membership state.
- TEST 12: Existing paid user is not downgraded.
- TEST 13: Trial user can select monthly membership (₹799).
- TEST 14: Trial user can select annual membership (₹6,999 with ~27% saving).
- TEST 15: Expired user can access billing and start checkout.
- TEST 16: Demo user cannot create a real Razorpay subscription (fails closed).
- TEST 17: B2B billing remains isolated from member billing.

---

## Frontend Tests
11 frontend logic tests implemented in [pricing_frontend_logic.unit.test.ts](file:///C:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/tests/unit/pricing_frontend_logic.unit.test.ts):
- TEST F1: Monthly price displays canonical ₹799 / month.
- TEST F2: Annual price displays canonical ₹6,999 / year.
- TEST F3: Annual savings resolves to ~27% and equivalent ₹583 / month.
- TEST F4: Consumer model presents exactly ONE membership plan: STRIVA.
- TEST F5: Pro and Elite are NOT selectable consumer membership cards.
- TEST F6: Trial messaging communicates 14 days free before paid billing.
- TEST F7: Active membership displays STRIVA Membership and billing interval.
- TEST F8: Grace period communicates payment attention required without false failure.
- TEST F9: Expired membership requires membership to continue.
- TEST F10: Checkout interval selection only switches "monthly" | "yearly" without amount overrides.
- TEST F11: Pending webhook/server synchronization displays non-activating message.

---

## Build
- **Frontend Build**: `npm run build:frontend` (Vite) passes with 0 errors.
- **Backend Build**: `npm run build:backend` (`tsc && tsc-alias`) passes with 0 errors.
- **Backend Test Suite**: 20 test files, 254 tests passing (100% pass rate).

---

## Responsive Verification
The single-plan pricing layout and billing dashboard were structured with mobile-first responsive flex/grid wrappers:
- Desktop: 1440px, 1280px, 1024px — clean centered card presentation, no multi-column clutter.
- Tablet: 768px — interval toggle and feature list naturally scale.
- Mobile: 430px, 390px, 375px — 100% width container, vertical stacking, no horizontal overflow, CTA fully tap-accessible.

---

## Accessibility
- Semantic button elements with distinct ARIA states (`aria-pressed`, `role="tab"`).
- Keyboard-accessible interval switcher with visible focus rings.
- Contrast-compliant text tokens (`text-foreground`, `text-muted-foreground`, `text-primary`).
- Clear non-color indicators for annual savings ("Save ~27%").

---

## Known Limitations
- Real Razorpay plan subscriptions require live Razorpay credentials (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) configured in the production environment.
- In offline/local environments without Razorpay keys, checkout returns clean configuration errors rather than fabricated simulated checkouts.

---

## Phase 7.5G Requirements
- TRINETRA AI Coach conversation limits and grace warnings refinement.
- Member onboarding completion and profile integration.

**Phase 7.5G NOT STARTED.**
