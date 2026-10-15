# STRIVA V2 — Phase 11 / DB-5L: Controlled Staging Deployment Report

**Document Version:** 1.0.0  
**Execution Timestamp:** 2026-10-14 12:37:50 IST  
**Authorized Target Project:** `ymrblyiwohvxptiqjfsi`  
**Database Host:** `db.ymrblyiwohvxptiqjfsi.supabase.co:5432` (Credentials redacted)  
**Applied Migration:** `backend/supabase/migrations/phase_11_prelaunch_hardening.sql`  
**Migration SHA-256:** `60A21EC0FE50A7755F00295E4A336A715963D4F0E1D3C4A8B3B37C616A6C1701`  
**Runner Executed:** `node backend/scripts/apply_staging_migrations.js phase_11_prelaunch_hardening.sql`  
**Runner Exit Status:** Code 0 (Success)  
**Before/After Migration Baseline:** 25 migrations -> 26 migrations  
**Production Database Status:** Strictly Untouched (Zero remote connections/mutations)  
**Deployment Gate Verdict:** **DB-5 DEPLOYED TO STAGING — VERIFIED**  

---

## 1. Executive Summary

Under Phase 11 / DB-5L, the pre-launch security and catalog hardening migration `phase_11_prelaunch_hardening.sql` was successfully applied to the authorized STRIVA V2 staging project (`ymrblyiwohvxptiqjfsi`) via the hardened, fail-closed custom migration runner [`backend/scripts/apply_staging_migrations.js`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/scripts/apply_staging_migrations.js).

All 6 fresh pre-deployment checks passed before execution. The deployment ran under an active transaction with advisory lock `746291048201582`. Post-deployment independent read-only introspection confirmed all expected invariants without defects, data loss, or schema regressions.

---

## 2. Step 1: Preflight Verification & Fresh Checks

Immediately prior to deployment execution at 12:37:05 IST, the following checks were confirmed:

| Preflight Check | Target Invariant | Result | Evidence / Details |
| :--- | :--- | :---: | :--- |
| **Migration Hash** | Exact SHA-256 match | **PASS** | `60A21EC0FE50A7755F00295E4A336A715963D4F0E1D3C4A8B3B37C616A6C1701` |
| **Runner Target Guard** | Guard executes before pool/connect | **PASS** | `validateStagingDatabaseUrl` verified in source prior to `new pg.Pool(...)` |
| **Exact-Filename Targeting** | Isolates execution to argument | **PASS** | `process.argv[2]` filtering logic confirmed in runner |
| **Transaction & Lock Invariants** | Lock `746291048201582` & ACID block | **PASS** | Advisory lock, `BEGIN`, `COMMIT`, `ROLLBACK`, atomic `_migrations` intact |
| **Live Staging Baseline** | Baseline at 25, DB-5 unapplied | **PASS** | Exactly 25 rows in `public._migrations`; phase 11 absent; fallback default active |
| **Backup Prerequisites** | Backups readable & rehearsal report | **PASS** | Schema (285 KB), Auth (3.6 KB), Data (48 KB) readable; DB-5E report verified |

---

## 3. Step 2: Migration Runner Execution

### Command Executed
```bash
node backend/scripts/apply_staging_migrations.js phase_11_prelaunch_hardening.sql
```

### Execution Log
```
=== STRIVA V2 STAGING MIGRATION RUNNER ===
[GUARD] Verifying target database host and project identity...
[GUARD] Target verified: Project "ymrblyiwohvxptiqjfsi" on host "db.ymrblyiwohvxptiqjfsi.supabase.co".
[LOCK] Acquiring transaction-level migration advisory lock...
[LOCK] Migration advisory lock acquired successfully.
[TARGET MODE] Applying strictly specified migration: phase_11_prelaunch_hardening.sql
[APPLYING] phase_11_prelaunch_hardening.sql...
[SUCCESS] phase_11_prelaunch_hardening.sql

✓ Successfully committed 1 migrations to staging database.
Total public tables now: 100
```
- **Exit Status:** Code 0
- **Transaction Rollback Triggered:** No (Committed cleanly)

---

## 4. Step 3: Independent Post-Deployment Verification

Read-only introspection was performed via [`scratch/verify_staging_post_db5.cjs`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/scratch/verify_staging_post_db5.cjs) directly against the staging database:

### 4.1. Migration Registry (`public._migrations`)
- **Total Recorded Migrations:** **26** (Baseline was 25)
- **Target Migration Record:** `phase_11_prelaunch_hardening.sql` recorded **exactly once** (`2026-10-14T07:07:47.914Z`)
- **Latest 5 Migrations:**
  1. `phase_11_prelaunch_hardening.sql` (2026-10-14T07:07:47.914Z)
  2. `phase_10b_workout_core_schema.sql` (2026-10-12T08:53:31.500Z)
  3. `phase_10a_nutrition_core_schema.sql` (2026-10-12T08:38:48.241Z)
  4. `phase_9b_legacy_identity_bridge.sql` (2026-10-11T17:07:36.445Z)
  5. `phase_9a_rls_recursion_fix.sql` (2026-10-11T15:01:50.203Z)

### 4.2. Tenant Isolation (`public.profiles.organization_id`)
- **Column Default:** `NULL` (Dropped from `'00000000-0000-0000-0000-000000000001'::uuid`)
- **Profiles Holding Fallback UUID:** **0** (Was 5 before migration)
- **Post-Migration Profile Assignments (Empirical Query):**
  - `2d27bc46-7744-49ca-aaac-7bd3ade86224` (`qa_verifier@sweatfix.com`): `organization_id = NULL`
  - `2dbbad1d-5988-4d6f-8c32-5c57080e56f5` (`priyanshupaswan648@gmail.com`): `organization_id = NULL`
  - `a1bf8b11-e2c7-4f7f-9d36-5af53418e20b` (`demo@sweatfix.com`): `organization_id = NULL`
  - `b96c0b60-9a8b-496f-9e33-f533982412f6` (`sagarpaswan2455@gmail.com`): `organization_id = NULL`
  - `e17245f8-6248-4c48-b58f-f0dc6a17dda8` (`ghoshdebosmita702@gmail.com`): `organization_id = NULL`

### 4.3. Demo Account Reset Routine (`public.reset_demo_account`)
- **Identity & Return Type:** `reset_demo_account(target_user_id uuid) RETURNS void`
- **Security Definer:** `prosecdef = true`
- **Search Path:** Hardened to `['search_path=pg_catalog, pg_temp']`
- **Routine Grants:** Granted strictly to `service_role` and `postgres`. `PUBLIC`, `anon`, and `authenticated` access is completely revoked.
- **Implementation Checks:**
  - Strict email check: `LOWER(v_demo_email) <> 'demo@sweatfix.com'` triggers security exception.
  - Type-correct legacy deletion: queries `public.legacy_user_id_map` to resolve `legacy_integer_id INT` before deleting from 12 legacy tables with `user_id = v_legacy_user_id`.
  - Child table ordering: child `exercise_sets` deleted before parent `v2_workout_sessions`.
  - Transaction safety: executes within single transaction block.

### 4.4. Routine Hardening Verification
- `public.handle_new_user()`:
  - `search_path = pg_catalog, pg_temp`
  - Fully schema-qualified table references (`public.profiles`, `public.subscriptions`, etc.)
  - Grants: `postgres`, `service_role`, `supabase_auth_admin`
- `public.is_org_member(UUID)`:
  - `search_path = pg_catalog, pg_temp`
  - Anonymous access revoked (`anon` has 0 grants)
  - Grants: `authenticated`, `service_role`, `postgres`
- `public.enforce_workout_session_state_transition()`:
  - `search_path = pg_catalog, pg_temp`

### 4.5. Data & Catalog Integrity
- `public.legacy_user_id_map`: 2 rows (Intact)
- `public.water_logs`: 13 rows (Intact)
- `public.subscriptions`: 4 rows (Intact)
- `public.organizations`: 1 row (Intact)
- `public.exercises`: 4 rows (Intact)
- No unexpected schema or data changes detected.

---

## 5. Automated Test Suite Results

| Test Suite | Scope | Result | Duration |
| :--- | :--- | :---: | :---: |
| `db5k_staging_target_guard.security.test.ts` | Staging target guard & evasion resistance | **17 / 17 PASS** | 11ms |
| `db5b_demo_reset_authorization.security.test.ts` | Demo account reset authorization & security | **10 / 10 PASS** | 15ms |
| `phase9a_rls_recursion_fix.security.test.ts` | RLS recursion prevention & tenant security | **51 / 51 PASS** | 54ms |
| `backend/tests/unit` (7 test files) | Backend domain APIs, entitlement, and resilience | **84 / 84 PASS** | 1.54s |
| `npm run build` | Full Vite frontend bundle + backend `tsc` compilation | **EXIT 0 (PASS)** | ~10s |

*All reported test results were freshly and independently executed.*

---

## 6. Deployment Gate Determination

All pre-deployment requirements, deployment execution invariants, post-deployment introspection assertions, and security test suites have passed with zero errors.

# **DB-5 DEPLOYED TO STAGING — VERIFIED**
