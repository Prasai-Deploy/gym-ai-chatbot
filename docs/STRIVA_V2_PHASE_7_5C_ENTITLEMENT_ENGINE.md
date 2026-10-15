# STRIVA V2 — PHASE 7.5C: CENTRAL SERVER-SIDE ENTITLEMENT ENGINE & MIDDLEWARE

## Objective
Establish the central, authoritative server-side entitlement evaluation engine and reusable middleware for STRIVA V2. This phase converts persisted database billing facts into definitive application access decisions (`DEMO`, `TRIAL`, `ACTIVE`, `GRACE_PERIOD`, `EXPIRED`, `CANCELLED`). The backend becomes the sole source of truth for subscription access, preventing client tampering or identity spoofing, and enforcing fail-closed security across protected member endpoints.

---

## Entitlement States
The application-level entitlement states are:
1. `DEMO`: Dedicated sandbox / read-only access for `demo@sweatfix.com` or users with `role: 'Demo User'`.
2. `TRIAL`: Active 14-day commercial trial where `status = 'trialing'` and `now < trial_ends_at`.
3. `ACTIVE`: Paid active subscription where `status = 'active'` and `now < current_period_end`.
4. `GRACE_PERIOD`: Temporary access buffer (3 calendar days / 72 hours) post `current_period_end` when `status = 'past_due'`.
5. `EXPIRED`: Complete access revocation when trials conclude, paid terms lapse without renewal, or lookup fails.
6. `CANCELLED`: Subscription scheduled to cancel at period end (`cancel_at_period_end = true` or `status = 'canceled'`). Retains access if `now < current_period_end`, revoked if `now >= current_period_end`.

*Note: These are strictly application-level states evaluated in memory. No PostgreSQL enum was created; database subscription status remains the persisted billing record.*

---

## State Evaluation Rules
The pure evaluation logic resides in `EntitlementService.evaluateSubscription`:
1. **Demo Identity**: If verified user email is `demo@sweatfix.com` or role is `'Demo User'`, state is `DEMO` (`hasAccess: true, isDemo: true`).
2. **Administrative Override**: Roles `'Platform Super Admin'` and `'Organization Owner'` receive bypass `ACTIVE` access.
3. **Missing Record**: If no subscription record exists in database, state is `EXPIRED` (`hasAccess: false`).
4. **Deterministic Calculation**: Evaluation uses UTC epoch timestamps for date comparisons (`trial_ends_at`, `current_period_end`).
5. **No Tier Inference**: Tier (`free`, `pro`, `elite`) alone never grants access. A subscription with `tier = 'pro'` but `status = 'trialing'` and `trial_ends_at < now` is strictly `EXPIRED`.

---

## Trial Logic
A user is evaluated as `TRIAL` if and only if:
- `sub.status === 'trialing'`
- `sub.trial_ends_at` is a valid ISO timestamp
- `now < new Date(sub.trial_ends_at)`

Access decision:
- `hasAccess: true`
- `daysRemaining = Math.max(0, Math.ceil((trial_ends_at - now) / 86400000))`
- `reason: 'ACTIVE_14_DAY_TRIAL'`

If `now >= new Date(sub.trial_ends_at)`:
- `state: 'EXPIRED'`
- `hasAccess: false`
- `daysRemaining: 0`
- `reason: 'TRIAL_PERIOD_EXPIRED'`

The trial cannot be extended by `EntitlementService`. EntitlementService is strictly read-only and never mutates database rows.

---

## Paid Logic
A user is evaluated as `ACTIVE` if and only if:
- `sub.status === 'active'`
- `sub.current_period_end` is a valid ISO timestamp
- `now < new Date(sub.current_period_end)`
- `sub.cancel_at_period_end !== true`

Access decision:
- `hasAccess: true`
- `daysRemaining = Math.max(0, Math.ceil((current_period_end - now) / 86400000))`
- `reason: 'ACTIVE_PAID_SUBSCRIPTION'`

If `now >= new Date(sub.current_period_end)`:
- `state: 'EXPIRED'`
- `hasAccess: false`
- `reason: 'PAID_PERIOD_EXPIRED'`

---

## Cancellation Logic
When a member cancels their subscription:
- If `cancel_at_period_end === true` or `status === 'canceled'`:
  - If `now < new Date(sub.current_period_end)`:
    - User has already paid for the cycle; access is preserved until the period concludes.
    - `state: 'CANCELLED'`
    - `hasAccess: true`
    - `reason: 'CANCELLED_ACTIVE_GRACE_UNTIL_PERIOD_END'`
  - If `now >= new Date(sub.current_period_end)`:
    - Paid period has concluded; access is revoked.
    - `state: 'CANCELLED'`
    - `hasAccess: false`
    - `reason: 'CANCELLATION_FINAL_PERIOD_ENDED'`

Cancellation alone never prematurely terminates access during an already-paid period.

---

## Grace Period Logic
When a recurring payment fails:
- Database records `status = 'past_due'`.
- Conservative Grace Period: 3 calendar days (72 hours) calculated from `sub.current_period_end`.
- If `now <= current_period_end + 3 days`:
  - `state: 'GRACE_PERIOD'`
  - `hasAccess: true`
  - `reason: 'PAYMENT_FAILED_IN_GRACE_PERIOD'`
- If `now > current_period_end + 3 days`:
  - `state: 'EXPIRED'`
  - `hasAccess: false`
  - `reason: 'GRACE_PERIOD_EXPIRED'`

This prevents abrupt service interruption during transient gateway retries while ensuring `past_due` records do not grant indefinite access.

---

## Demo Logic
- Identified by verified Supabase JWT claims: `email === 'demo@sweatfix.com'` or `role === 'Demo User'`.
- Evaluates directly to `state: 'DEMO'`, `hasAccess: true`, `isDemo: true`.
- Zero database queries: Bypasses `subscriptions` table query entirely.
- Zero Razorpay requirements: Does not require payment methods, subscriptions, or orders.
- Isolated sandbox: Upstream middleware and tools enforce read-only demo execution policies.

---

## Expiration Logic
When access is denied (`hasAccess: false`):
- `state` is either `EXPIRED` or terminal `CANCELLED`.
- Downstream protected controllers are blocked before invocation.
- Reusable middleware throws `SubscriptionRequiredError` (HTTP 403).

---

## Server Authority
Entitlement resolution derives strictly from server-side verified credentials:
- `req.user.id` is extracted exclusively from the cryptographically verified Supabase Auth JWT.
- Ignored/rejected client spoofing attempts:
  - `req.body.user_id` / `req.body.userId` / `req.body.member_id`
  - `req.query.user_id` / `req.query.userId`
  - `x-user-id` header
  - Client-supplied subscription status or tier claims
- Tenant boundaries: `x-organization-id` header does not grant access to unentitled users.

---

## Middleware Architecture
Canonical implementation in `backend/src/middleware/entitlement.middleware.ts`:
- Factory: `requireActiveEntitlement(options?: { feature?: string }, service?: EntitlementService)`
- Alias: `requireEntitlement`
- Request Pipeline Ordering:
  ```
  requireAuth (Verifies Supabase JWT → sets req.user)
          ↓
  tenantMiddleware (Server-side Org Membership derivation)
          ↓
  requireRoles (RBAC permissions where required)
          ↓
  requireActiveEntitlement (Authoritative Subscription Check → sets req.entitlement)
          ↓
  controller
  ```
- Downstream Request Context: Populates `req.entitlement` with `EntitlementResult`.

---

## API Error Contract
When access is denied, the error handler returns standard structured HTTP 403:
```json
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_REQUIRED",
    "message": "An active STRIVA subscription is required to access this feature.",
    "entitlementState": "EXPIRED",
    "retryable": false
  }
}
```
HTTP 401 is reserved strictly for unauthenticated requests. Authenticated but unentitled members receive HTTP 403. Sensitive internal billing IDs and database errors are never leaked in API responses.

---

## Protected Features
Canonical middleware `requireActiveEntitlement` is wired to protect:
- **TRINETRA AI Assistant**:
  - `POST /api/v1/ai/chat`
  - `POST /api/v1/ai/agent`
  - `GET /api/v1/ai/conversations`
  - `GET /api/v1/ai/conversations/:id/messages`
  - `PATCH /api/v1/ai/conversations/:id`
  - `DELETE /api/v1/ai/conversations/:id`
  - `GET /api/v1/ai/agent/analytics`
- **Member Feature Middleware**:
  - Exported and prepared for Workout (`/api/v1/workouts/*`), Nutrition (`/api/v1/nutrition/*`), and Progress (`/api/v1/progress/*`).

---

## Unprotected Account Features
The following routes remain intentionally UNPROTECTED by entitlement middleware to allow expired members to manage accounts and subscribe:
- **Identity & Profile**:
  - `GET /api/v1/identity/profile`
  - `PATCH /api/v1/identity/profile`
  - `GET /api/v1/identity/profile/fitness`
  - `PATCH /api/v1/identity/profile/fitness`
  - `GET /api/v1/identity/profile/preferences`
  - `PATCH /api/v1/identity/profile/preferences`
  - `GET /api/v1/identity/profile/settings`
  - `PATCH /api/v1/identity/profile/settings`
  - `GET /api/v1/identity/me`
- **Billing Management**:
  - `GET /api/v1/billing/status`
  - `POST /api/v1/billing/checkout`
  - `POST /api/v1/billing/razorpay/checkout`
  - `POST /api/v1/billing/razorpay/verify`
  - `GET /api/v1/billing/invoices`
  - `POST /api/v1/billing/webhook/razorpay`

---

## TRINETRA Behavior
- `TRIAL`: Allowed full AI assistant access.
- `ACTIVE`: Allowed full AI assistant access.
- `GRACE_PERIOD`: Allowed full AI assistant access.
- `DEMO`: Allowed full AI assistant access in sandbox / read-only mode (`isDemo = true`).
- `EXPIRED` / Unsubscribed: Blocked at HTTP API boundary before invoking LLM or agent runtime with HTTP 403 `SUBSCRIPTION_REQUIRED`.

---

## Security Tests
20 comprehensive security tests implemented in `backend/tests/security/entitlement.security.test.ts`:
- **TEST 1**: New trial user receives TRIAL entitlement.
- **TEST 2**: Valid trial receives hasAccess=true.
- **TEST 3**: Expired trial receives EXPIRED and hasAccess=false.
- **TEST 4**: Trial user with tier=pro is not mistaken for paid ACTIVE.
- **TEST 5**: Active paid subscription receives ACTIVE.
- **TEST 6**: Cancel-at-period-end user retains access until current_period_end.
- **TEST 7**: Expired paid subscription does not retain access.
- **TEST 8**: Demo User receives DEMO.
- **TEST 9**: Demo User does not require Razorpay.
- **TEST 10**: Client cannot specify another user's user_id to obtain entitlement.
- **TEST 11**: Entitlement lookup uses verified req.user.id.
- **TEST 12**: Subscription lookup failure fails closed.
- **TEST 13**: Protected feature route returns 403 SUBSCRIPTION_REQUIRED when expired.
- **TEST 14**: Profile/account/billing routes are not accidentally gated.
- **TEST 15**: TRINETRA expired user is denied server-side.
- **TEST 16**: TRINETRA trial user is allowed.
- **TEST 17**: TRINETRA Demo User remains sandbox/read-only.
- **TEST 18**: Cross-tenant context cannot grant entitlement.
- **TEST 19**: No entitlement code mutates subscription data.
- **TEST 20**: Tier alone cannot grant access.

All 20 tests pass.

---

## Build Results
- **Backend Test Suite**: 16 test files passed, 188 tests passed (0 failures).
- **Backend TypeScript Compilation**: `tsc && tsc-alias` exited with code 0 (zero errors).
- **Workspace Build**: `vite build` and backend build completed successfully.

---

## Database Verification Status
Live database verification: **NO** (Local test and mock verification; migration `phase_7b_trial_foundation.sql` from Phase 7.5B establishes the database schema for production deployment).

---

## Known Limitations
- Caching is intentionally excluded to ensure immediate real-time enforcement of subscription expiration and status changes without stale cache vulnerabilities.
- Grace period is calculated in-memory based on `past_due` status and `current_period_end` date; automated status transitions rely on Razorpay webhooks (Phase 7.5D).

---

## Remaining Billing Security Work
The following security issues remain for Phase 7.5D:
- Insecure client-updatable `PATCH /api/v1/billing/subscription` endpoint must be restricted/removed.
- Legacy unverified webhook route `POST /api/v1/billing/webhook` must be deprecated.
- Razorpay webhook HMAC verification and signature replay defense to be hardened.
- Server-side Razorpay order creation and subscription synchronization logic.

---

## Files Created
- `backend/src/modules/billing/services/EntitlementService.ts`
- `backend/src/middleware/entitlement.middleware.ts`
- `backend/tests/security/entitlement.security.test.ts`
- `docs/STRIVA_V2_PHASE_7_5C_ENTITLEMENT_ENGINE.md`

## Files Modified
- `backend/src/errors/AppError.ts` (Added `SubscriptionRequiredError`)
- `backend/src/middleware/errorHandler.ts` (Handled `SubscriptionRequiredError` -> 403 JSON)
- `backend/src/modules/billing/repositories/SubscriptionRepository.ts` (Added read-only `findSubscriptionByUserId`)
- `backend/src/modules/ai/routes.ts` (Integrated `requireActiveEntitlement`)
- `backend/tests/unit/trinetra_runtime.unit.test.ts` (Updated mock to include Phase 7.5B subscriptions table)

## Files Deleted
None.

---

## Out of Scope
Confirming strictly out of scope:
- Phase 7.5D NOT STARTED
- Razorpay logic NOT CHANGED
- billing webhook NOT CHANGED
- billing UI NOT CHANGED
- frontend gating NOT STARTED
- Workout UI NOT CHANGED
- Nutrition UI NOT CHANGED
- Progress UI NOT CHANGED
- TRINETRA UI NOT CHANGED
