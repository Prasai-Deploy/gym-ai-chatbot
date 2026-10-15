# STRIVA V2 — PHASE 7.5D: RAZORPAY & SUBSCRIPTION SYNCHRONIZATION HARDENING

## 1. Primary Objective
Harden the Razorpay billing system and subscription synchronization pipeline in STRIVA V2. Ensure that subscription state cannot be altered by unauthorized client requests, eliminate self-upgrade vulnerabilities, deprecate insecure legacy webhooks, and establish the server-side verified Razorpay webhook as the sole authoritative asynchronous synchronization source.

---

## 2. Architecture Overview
```
CLIENT
  ↓
Authenticated Billing API (/api/v1/billing/razorpay/checkout)
  ↓
Razorpay Checkout (Server-Configured Pricing & Plans)
  ↓
Razorpay Payment / Subscription
  ↓
Canonical Razorpay Webhook (/api/v1/billing/webhook/razorpay)
  ↓
Cryptographic HMAC SHA-256 Signature Verification (Raw Body)
  ↓
Zod Event Schema Validation (RazorpayWebhookPayloadSchema)
  ↓
Deterministic Event ID & Atomic Idempotency Check (payment_events)
  ↓
Authoritative Billing State Synchronization (SubscriptionRepository)
  ↓
Invoice Generation (invoices)
  ↓
Central Entitlement Engine (EntitlementService)
  ↓
Authoritative Access Decision (requireActiveEntitlement)
```

---

## 3. Client-Side Mutation Removal (`PATCH /billing/subscription`)
- **Vulnerability Remediated**: The legacy endpoint allowed normal authenticated users to specify arbitrary `tier` and `interval` values, setting their subscription to `active` without verified payment.
- **Remediation Action**: `PATCH /api/v1/billing/subscription` has been **completely removed** from the routing table.
- **Client Behavior**: Requests to `PATCH /api/v1/billing/subscription` return `HTTP 404 Not Found`.
- **Security Guarantee**: A member cannot self-upgrade to paid tiers (`pro` or `elite`) or alter period dates through client-accessible endpoints.

---

## 4. Legacy Webhook Deprecation (`POST /billing/webhook`)
- **Vulnerability Remediated**: The legacy generic webhook lacked cryptographic HMAC signature verification and accepted arbitrary client-provided `user_id` and `tier` payloads.
- **Remediation Action**: The legacy route has been deprecated and now fails closed with `HTTP 410 Gone`.
- **Response Contract**:
  ```json
  {
    "success": false,
    "error": {
      "code": "ENDPOINT_DEPRECATED",
      "message": "Legacy webhook endpoint is deprecated. Use canonical /api/v1/billing/webhook/razorpay with cryptographic HMAC signature."
    }
  }
  ```

---

## 5. Canonical Razorpay Webhook Hardening (`POST /billing/webhook/razorpay`)
- Canonical asynchronous synchronization endpoint: `/api/v1/billing/webhook/razorpay`.
- Validates cryptographic HMAC signature over exact unparsed raw request body bytes.
- Does not expose internal server errors, database IDs, or provider secrets in responses.
- Idempotently acknowledges processed and duplicate events with `HTTP 200 { "received": true, "processed": boolean }`.

---

## 6. Raw Body & Cryptographic HMAC SHA-256 Signature Verification
- **Raw Body Strategy**: Express JSON parser in `app.ts` captures exact raw payload bytes in `req.rawBody` using the `verify` callback (`express.json({ verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); } })`).
- **Signature Computation**: `crypto.createHmac('sha256', secret).update(rawBody).digest('hex')`.
- **Timing Attack Mitigation**: Signatures are compared using constant-time string comparisons (`crypto.timingSafeEqual`).
- **Tampering Defense**: Modifying even one byte of the raw body or headers invalidates the signature and rejects the request (`HTTP 400 ValidationError`).

---

## 7. Webhook Secret Configuration & Fail-Closed Policy
- Webhook secret is loaded strictly from server environment configuration (`env.RAZORPAY_WEBHOOK_SECRET` / `process.env.RAZORPAY_WEBHOOK_SECRET`).
- Rejects any client-provided secret in headers or body.
- Fails closed if the secret is unconfigured or empty on the server, rejecting webhook processing with zero database mutations.
- Secrets are never logged or exposed in API responses.

---

## 8. Event Validation & Supported Event Types
Incoming webhook payloads are validated using `RazorpayWebhookPayloadSchema` (Zod). Supported Razorpay events and their authoritative database state updates:
1. `subscription.charged`:
   - `status`: `'active'`
   - `tier`: Extracted from plan notes (`'pro'` | `'elite'`)
   - `interval`: Extracted from plan notes (`'monthly'` | `'yearly'`)
   - `provider`: `'razorpay'`
   - Period dates synchronized from Razorpay timestamps or server-computed UTC dates
   - `cancel_at_period_end`: `false`
   - Invoice created in `invoices` table
2. `subscription.activated`:
   - Same as `subscription.charged`; marks subscription `active` and synchronizes Razorpay IDs
3. `payment.captured`:
   - Marks subscription `active` and generates invoice
4. `payment.failed`:
   - Sets `status: 'past_due'` (triggers deterministic 72-hour grace period in `EntitlementService`)
5. `subscription.cancelled`:
   - Sets `status: 'canceled'`, `cancel_at_period_end: true`, and `canceled_at: now`
   - Preserves `current_period_end` so user retains access until their paid term concludes
6. `subscription.halted` / `subscription.paused`:
   - Sets `status: 'past_due'`
7. Unhandled / unknown events:
   - Safely acknowledged (`{ received: true, processed: false }`) with zero database mutations

---

## 9. Idempotency & Replay Protection
- Deterministic event ID resolution:
  `event_id = payload.event_id || (payId ? eventType + '_' + payId : null) || (subId ? eventType + '_' + subId + '_' + created_at : null)`.
- Unique constraint on `payment_events.event_id` in PostgreSQL (`23505` violation on duplicate insert).
- Processing flow:
  1. Record event in `payment_events` with status `PROCESSED`.
  2. If duplicate detected (`isSuccess && value === false`), immediately return `{ received: true, processed: false, reason: 'IDEMPOTENT_DUPLICATE' }`.
  3. Prevents duplicate charges, duplicate invoice creation, or re-extending period dates on webhook replays.

---

## 10. Invoicing & Subscription Synchronization
- Successful payments automatically create an entry in `public.invoices`.
- Converts amount from Razorpay paise to rupees (`amount_paid / 100`).
- Sets `currency: 'inr'`, `status: 'paid'`, `stripe_invoice_id: razorpay_payment_id`.
- Stores `subscription_id` reference to `public.subscriptions`.

---

## 11. Razorpay Checkout & Payment Verification Hardening
- **Checkout (`POST /api/v1/billing/razorpay/checkout`)**:
  - Rejects `tier: 'free'` with `ValidationError`.
  - Maps allowed commercial plans (`pro`, `elite`) to configured Razorpay plan IDs.
  - User identity is strictly derived from verified Supabase JWT (`req.user.id`).
- **Payment Verification (`POST /api/v1/billing/razorpay/verify`)**:
  - Validates `razorpay_payment_id`, `razorpay_subscription_id`, `razorpay_signature` with Zod.
  - Cryptographically verifies signature (`${paymentId}|${subscriptionId}`) against `RAZORPAY_KEY_SECRET`.
  - Computes period dates server-side (30 days for monthly, 365 days for yearly); never trusts client period dates.
  - Idempotently logs payment event and creates invoice.

---

## 12. Billing Status Security (`GET /api/v1/billing/status`)
- Exposes authoritative entitlement state derived from `EntitlementService`:
  `state`, `hasAccess`, `daysRemaining`, `trialEndsAt`, `currentPeriodEnd`, `tier`, `status`, `cancelAtPeriodEnd`, `limits`.
- Zero database mutations during status lookup (`findSubscriptionByUserId` is read-only).
- Sandbox isolation: Demo User (`demo@sweatfix.com`) bypasses database lookups and receives full sandbox access.
- Excludes sensitive provider secrets (`RAZORPAY_KEY_SECRET`, raw webhook secrets, internal credentials).

---

## 13. Security Test Coverage
18 security tests implemented in `backend/tests/security/razorpay_hardening.security.test.ts`:
- **TEST 1**: `PATCH /api/v1/billing/subscription` is completely removed (returns 404).
- **TEST 2**: Normal member cannot call client endpoint to self-upgrade to active paid subscription.
- **TEST 3**: Legacy `POST /api/v1/billing/webhook` is deprecated and returns HTTP 410 Gone.
- **TEST 4**: Webhook rejects request when HMAC SHA-256 signature is missing or invalid.
- **TEST 5**: Webhook signature verification fails closed if webhook secret is not configured on server.
- **TEST 6**: Webhook rejects request when raw body is tampered with.
- **TEST 7**: Webhook rejects malformed payloads missing event name.
- **TEST 8**: Webhook enforces idempotency — duplicate event does not mutate billing state twice.
- **TEST 9**: Webhook `subscription.charged` synchronizes active subscription and creates invoice.
- **TEST 10**: Webhook `payment.failed` sets subscription to `past_due`.
- **TEST 11**: Webhook `subscription.cancelled` sets canceled status without terminating paid cycle prematurely.
- **TEST 12**: Webhook `subscription.halted` marks subscription as `past_due`.
- **TEST 13**: Webhook unhandled event safely acknowledges without mutating subscription.
- **TEST 14**: `POST /api/v1/billing/razorpay/checkout` rejects `tier=free`.
- **TEST 15**: `POST /api/v1/billing/razorpay/verify` requires valid cryptographic signature.
- **TEST 16**: `POST /api/v1/billing/razorpay/verify` computes period dates server-side upon valid signature.
- **TEST 17**: `GET /api/v1/billing/status` returns authoritative entitlement without exposing provider secrets.
- **TEST 18**: `GET /api/v1/billing/status` works for Demo User without database lookups.

All 18 tests pass.

---

## 14. Build Results
- **Backend Test Suite**: 17 test files passed, 206 tests passed (0 failures).
- **Backend TypeScript Build**: `tsc && tsc-alias` exited with code 0 (zero errors).
- **Workspace Build**: Full frontend (`vite build`) and backend build succeeded with zero errors.

---

## 15. Files Created
- `backend/tests/security/razorpay_hardening.security.test.ts`
- `docs/STRIVA_V2_PHASE_7_5D_RAZORPAY_HARDENING.md`

## 16. Files Modified
- `backend/src/modules/billing/domain/BillingSchemas.ts` (Added `PaidSubscriptionTierEnum`, `VerifyRazorpayPaymentDTO`, `RazorpayWebhookPayloadSchema`)
- `backend/src/modules/billing/providers/RazorpayProvider.ts` (Exported `RAZORPAY_PRICING`, added `hasWebhookSecret()`)
- `backend/src/modules/billing/repositories/SubscriptionRepository.ts` (Added `findSubscriptionByRazorpaySubId`, `createInvoice`, `isPaymentEventProcessed`)
- `backend/src/modules/billing/services/BillingService.ts` (Hardened webhook processing, verified payments, safe status, removed arbitrary mutation)
- `backend/src/modules/billing/controllers/BillingController.ts` (Removed `updateSubscription`, hardened checkout, verification, and webhook handlers)
- `backend/src/modules/billing/routes.ts` (Removed `PATCH /subscription`, deprecated legacy webhook with 410 Gone)

---

## 17. Out of Scope
Confirming strictly out of scope:
- Frontend UI / Pricing page redesign NOT STARTED (Phase 7.5E / 7.5F)
- Trial countdown banner NOT STARTED (Phase 7.5E)
- Expired lock screen NOT STARTED (Phase 7.5E)
- ProtectedRoute / MemberLayout NOT MODIFIED
- Workout / Nutrition / Progress / TRINETRA UI NOT MODIFIED
- Phase 7.5E NOT STARTED
