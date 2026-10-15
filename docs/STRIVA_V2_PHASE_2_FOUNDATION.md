# STRIVA V2 — PHASE 2: REPOSITORY SAFETY & DEVELOPMENT FOUNDATION REPORT

## 1. GIT SAFETY CHECKPOINT

- **Safety Tag**: `v1-audit-checkpoint` (Created and verified via `git tag -l`)
- **Commit SHA**: `79f3329376ab8b698ff57631b0681c7ab2576dc9`
- **Current Branch**: `main`
- **Working Tree State**: Clean baseline with Phase 1 documentation checked in.
- **Verification Commands**:
  ```bash
  git status
  git branch
  git log -1
  git tag -l "v1-audit-checkpoint"
  ```

---

## 2. REPOSITORY STATE & BUILD VERIFICATION

Verification of all build and test targets succeeded:

| Build Target | Command Executed | Result | Asset Chunks / Tests |
| :--- | :--- | :--- | :--- |
| **Frontend Production Build** | `npm run build:frontend` | ✅ **PASSED** | 2,429 modules transformed (`dist/index.html` generated in 6.49s) |
| **Backend Production Build** | `npm run build:backend` | ✅ **PASSED** | `tsc && tsc-alias` clean compilation (`backend/dist/server.js`) |
| **Backend Test Suite** | `cd backend && npm test` | ✅ **PASSED** | **67 / 67 Security & Module Tests Passed** (0 failures) |

---

## 3. CANONICAL DEVELOPMENT COMMANDS

The root package scripts support the unified V2 development workflow:

- `npm run dev`: Concurrent startup of Vite frontend dev server + tsx backend dev server.
- `npm run dev:frontend`: Launch Vite dev server with proxy routing to `/api/v1` (`http://localhost:5000`).
- `npm run dev:backend`: Launch tsx backend hot-reloader (`backend/src/server.ts`).
- `npm run build`: Production build of frontend (`dist/`) and backend (`backend/dist/`).
- `cd backend && npm test`: Run full Vitest security and domain test suite.

---

## 4. FRONTEND BOUNDARY SPECIFICATION

- **Location**: `src/api/`
- **Client**: `httpClient.ts` Axios instance configured with `Authorization: Bearer <Supabase_JWT>` header injection.
- **Domain API Callers**: `authApi.ts`, `workoutApi.ts`, `nutritionApi.ts`, `progressApi.ts`, `coachApi.ts`, `gymApi.ts`, `billingApi.ts`.
- **Strict Error Rule**: Network and HTTP errors must propagate cleanly to React UI components. Hardcoded mock fallbacks in frontend API hooks are strictly marked for removal in Phase 4-8.

---

## 5. BACKEND BOUNDARY SPECIFICATION

- **Location**: `backend/src/`
- **Base Route**: `/api/v1`
- **Bootstrapping**: `backend/src/app/app.ts` configures Helmet, CORS, Compression, correlation ID injection, security rate-limiting, Pino HTTP logging, and standardized `AppError` handling.
- **Environment Validation**: `backend/src/config/env.ts` enforces strict Zod schema parsing on startup for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `GROQ_API_KEY`.

---

## 6. DESIGN SYSTEM BOUNDARY

- **Canonical Root**: `src/design-system/`
- **Visual Primitives**: Core visual tokens (`colors.ts`, `typography.ts`, `spacing.ts`, `shadows.ts`) and shell layouts (`AppShell.tsx`, `ThemeProvider.tsx`).
- **Naming Standard**: Single canonical primitives (`Button.tsx`, `Card.tsx`, `StatRing.tsx`). Zero tolerance for duplicate component names (`V2Card`, `V3Card`, `MinimalCard`).

---

## 7. LEGACY ISOLATION STRATEGY

To prevent new development from accidentally consuming legacy code while preserving historical backup integrity:

```
CHATBOT_PROJECT/
├── server.legacy.ts          # [ISOLATED LEGACY] Monolithic server - DO NOT IMPORT IN V2
├── legacy/                   # [ISOLATED LEGACY] V1 routes & services - DO NOT IMPORT IN V2
└── backend/src/              # [ACTIVE V2 CANONICAL] All new backend modules target this folder
```

---

## 8. ENVIRONMENT CONFIGURATION STRATEGY

Variables are strictly categorized in `backend/src/config/env.ts`:
1. **Required Runtime Variables**: `PORT`, `NODE_ENV`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`.
2. **Optional Integration Variables**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `GROQ_API_KEY`.
3. **Security Rule**: Zero server secrets (`SUPABASE_SERVICE_KEY`, `RAZORPAY_KEY_SECRET`) are exposed to client bundle builds.

---

## 9. TESTING FOUNDATION SUMMARY

The current Vitest test runner (`backend/vitest.config.ts`) verifies 7 critical security suites:
1. `razorpay.security.test.ts` (16 tests) — Cryptographic HMAC signature validation.
2. `analytics.security.test.ts` (13 tests) — Multi-tenant turnstile check-in security.
3. `ai_memory.security.test.ts` (10 tests) — TRINETRA user memory isolation.
4. `admin_auth.security.test.ts` (8 tests) — Admin RBAC authorization boundaries.
5. `ai_provider.security.test.ts` (6 tests) — Groq provider error propagation.
6. `ai_usage.security.test.ts` (6 tests) — Token & rate limit tracking.
7. `rls.security.test.ts` (8 tests) — Supabase database RLS policies.

---

## 10. REMAINING TECHNICAL DEBT & PHASE 3 PREREQUISITES

1. **Database Migration Consolidation (Phase 3)**: Unify legacy root `.sql` scripts into timestamped migrations under `backend/supabase/migrations/`.
2. **Tenant Middleware Security Patch (Phase 4)**: Replace fallback org ID (`'00000000-0000-0000-0000-000000000001'`) with database org membership queries.
3. **Frontend API Hook Refactoring (Phase 5-8)**: Remove mock catch blocks in `useStrivaApi.ts` to rely exclusively on `/api/v1` backend endpoints.
