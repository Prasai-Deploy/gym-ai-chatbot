# STRIVA V2 — Phase 12 & 12B: Staging Deployment Report

**Document Version:** 1.0.0  
**Execution Timestamp:** 2026-10-14 17:20:00 IST  
**Authorized Target Project:** `ymrblyiwohvxptiqjfsi`  
**Database Host:** `db.ymrblyiwohvxptiqjfsi.supabase.co:5432`  
**Server IP Address:** `2406:da1a:b00:1301:3210:50bf:8c8:6055` (PostgreSQL 17.6 on aarch64 Linux)  
**Applied Migrations:**
1. `backend/supabase/migrations/phase_12_legacy_routine_hardening.sql` (Exit Code 0)
2. `backend/supabase/migrations/phase_12b_consumer_analytics_persistence.sql` (Exit Code 0)  
**Migration Hashes (SHA-256):**
- Phase 12: `A53F714C7ADBCEBD81BF08DAA8C16557F073CD9A1C990F0324C314F07B9396DE`
- Phase 12B: `008D7973C251F276A88FF04C26C76298A027B06E70FBAF09D2CF08AE40FE7703`  
**Migration Baseline Advancement:** Exactly 26 -> 27 -> 28 migrations  
**Production Database Status:** Strictly Untouched (Zero remote connections or mutations)  
**Working Tree Status:** All 45 modified UI components, backend modules, and untracked artifacts strictly preserved  
**Deployment Verdict:** **PHASE 12 & 12B STAGING DEPLOYMENT COMPLETE & VERIFIED**

---

## 1. Executive Summary

On October 14, 2026, following explicit operator approval and strict pre-deployment verification, **Phase 12** (`phase_12_legacy_routine_hardening.sql`) and **Phase 12B** (`phase_12b_consumer_analytics_persistence.sql`) were successfully deployed to the authorized STRIVA V2 staging project (`ymrblyiwohvxptiqjfsi`) using the canonical migration runner [`backend/scripts/apply_staging_migrations.js`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/scripts/apply_staging_migrations.js).

All deployment phases executed under ACID transactions protected by advisory lock `746291048201582`. Post-deployment independent live introspection and automated test suites confirmed:
1. **Migration Baseline:** Advanced from 26 to exactly **28 migrations**.
2. **Routine Hardening:** All 5 legacy routines (`get_admin_role`, `is_admin`, `update_membership_statuses`, `update_modified_column`, `update_updated_at_column`) were converted to `SECURITY INVOKER`, had their search paths pinned to `pg_catalog, pg_temp`, had broad public and anonymous execution grants revoked, and had maintenance routines sealed from PostgREST RPC access.
3. **Trigger & Cron Continuity:** All 14 update triggers (11 on `update_modified_column`, 3 on `update_updated_at_column`) and the `0 0 * * *` daily maintenance cron job were verified intact and active.
4. **Consumer Analytics Schema Remediated:** `public.ai_usage_analytics.organization_id` dropped its `NOT NULL` constraint (`is_nullable = 'YES'`), partial index `idx_ai_usage_analytics_consumer_user` was created, and dual consumer RLS policies were established.
5. **Live Constraint & Isolation Tests:** Verified on staging that consumer usage events persist with `organization_id = NULL`, B2B usage persists with valid organization UUIDs, non-existent organization UUIDs are strictly rejected with foreign key error `23503`, and tenant/user query isolation is preserved.
6. **Idempotency Confirmed:** Subsequent runner executions of both migrations cleanly skipped with zero mutations.
7. **Test Suite & Build Verification:** Full security suite (587/587 passing across 36 files), unit suite (84/84 passing), TypeScript backend build, and full workspace build passed with 100% success.

---

## 2. Pre-Deployment Verification Matrix

Immediately prior to execution at 17:18 IST, all 4 preconditions were verified programmatically:

| Precondition Check | Expected Invariant | Result | Evidence / Details |
| :--- | :--- | :---: | :--- |
| **1. Target Guard** | Guard executes before connect | **PASS** | `validateStagingDatabaseUrl` confirmed target host `db.ymrblyiwohvxptiqjfsi.supabase.co` |
| **2. Phase 12 Hash** | Exact SHA-256 match | **PASS** | `A53F714C7ADBCEBD81BF08DAA8C16557F073CD9A1C990F0324C314F07B9396DE` |
| **3. Phase 12B Hash** | Exact SHA-256 match | **PASS** | `008D7973C251F276A88FF04C26C76298A027B06E70FBAF09D2CF08AE40FE7703` |
| **4. Baseline 26 Backups** | 3 files exist & match checksums | **PASS** | `schema` (225 KB), `data` (52 KB), `auth` (8.8 KB) verified in `scratch/backups/` |
| **5. Live Staging Baseline** | Baseline at 26, Phase 12 absent | **PASS** | Exactly 26 records in `public._migrations`; zero Phase 12 records |

---

## 3. Step 1: Phase 12 Routine Hardening Deployment

### 3.1. Command Executed
```bash
node backend/scripts/apply_staging_migrations.js phase_12_legacy_routine_hardening.sql
```

### 3.2. Execution Log
```
=== STRIVA V2 STAGING MIGRATION RUNNER ===
[GUARD] Verifying target database host and project identity...
[GUARD] Target verified: Project "ymrblyiwohvxptiqjfsi" on host "db.ymrblyiwohvxptiqjfsi.supabase.co".
[LOCK] Acquiring transaction-level migration advisory lock...
[LOCK] Migration advisory lock acquired successfully.
[TARGET MODE] Applying strictly specified migration: phase_12_legacy_routine_hardening.sql
[APPLYING] phase_12_legacy_routine_hardening.sql...
[SUCCESS] phase_12_legacy_routine_hardening.sql

✓ Successfully committed 1 migrations to staging database.
Total public tables now: 100
```
**Runner Exit Code:** `0` (Success)

### 3.3. Independent Live Catalog Verification
Introspected directly from staging via read-only SQL queries:
- **Baseline Count:** Advanced from 26 to **27**.
- **Migration Record:** `phase_12_legacy_routine_hardening.sql` recorded at `Wed Oct 14 2026 17:18:16 GMT+0530`.
- **Routines Hardened:**
  - `get_admin_role()`: `is_security_definer = false`, `search_path = pg_catalog, pg_temp`, grants: `[authenticated, postgres, service_role]`.
  - `is_admin()`: `is_security_definer = false`, `search_path = pg_catalog, pg_temp`, grants: `[authenticated, postgres, service_role]`.
  - `update_membership_statuses()`: `is_security_definer = false`, `search_path = pg_catalog, pg_temp`, grants: `[postgres, service_role]` (sealed from `PUBLIC`, `anon`, and `authenticated`).
  - `update_modified_column()`: `is_security_definer = false`, `search_path = pg_catalog, pg_temp`, grants: `[authenticated, postgres, service_role]`.
  - `update_updated_at_column()`: `is_security_definer = false`, `search_path = pg_catalog, pg_temp`, grants: `[authenticated, postgres, service_role]`.
- **Trigger Integrity:** Exactly 14 attached update triggers confirmed intact.
- **pg_cron Job:** Job 1 (`0 0 * * *` `SELECT update_membership_statuses()`) confirmed active as user `postgres`.
- **Automated Verification:** `phase12a_routine_hardening.security.test.ts` passed 10 of 10 tests (100%).

---

## 4. Step 2: Phase 12B Consumer Analytics Persistence Deployment

### 4.1. Command Executed
```bash
node backend/scripts/apply_staging_migrations.js phase_12b_consumer_analytics_persistence.sql
```

### 4.2. Execution Log
```
=== STRIVA V2 STAGING MIGRATION RUNNER ===
[GUARD] Verifying target database host and project identity...
[GUARD] Target verified: Project "ymrblyiwohvxptiqjfsi" on host "db.ymrblyiwohvxptiqjfsi.supabase.co".
[LOCK] Acquiring transaction-level migration advisory lock...
[LOCK] Migration advisory lock acquired successfully.
[TARGET MODE] Applying strictly specified migration: phase_12b_consumer_analytics_persistence.sql
[APPLYING] phase_12b_consumer_analytics_persistence.sql...
[SUCCESS] phase_12b_consumer_analytics_persistence.sql

✓ Successfully committed 1 migrations to staging database.
Total public tables now: 100
```
**Runner Exit Code:** `0` (Success)

### 4.3. Independent Live Schema & Policy Verification
Introspected directly from staging:
- **Baseline Count:** Advanced from 27 to **28**.
- **Migration Record:** `phase_12b_consumer_analytics_persistence.sql` recorded at `Wed Oct 14 2026 17:19:01 GMT+0530`.
- **Column Nullability:** `public.ai_usage_analytics.organization_id` confirmed `is_nullable = 'YES'`.
- **Partial Index:** `CREATE INDEX idx_ai_usage_analytics_consumer_user ON public.ai_usage_analytics USING btree (user_id, created_at) WHERE (organization_id IS NULL)` confirmed.
- **RLS Policies:** Exactly 4 policies active on `ai_usage_analytics`:
  1. `"Users view own consumer AI usage analytics"` (SELECT)
  2. `"Users insert own consumer AI usage analytics"` (INSERT)
  3. `"Tenant AI usage analytics select policy"` (SELECT)
  4. `"Tenant AI usage analytics insert policy"` (INSERT)

---

## 5. Live Staging Data Integrity & Isolation Tests

Live assertions executed directly against staging database `db.ymrblyiwohvxptiqjfsi.supabase.co`:

```
--- Data Persistence & Integrity Verification ---
Using Test User: e17245f8-6248-4c48-b58f-f0dc6a17dda8 (ghoshdebosmita702@gmail.com)
Using Test Org:  00000000-0000-0000-0000-000000000001 (STRIVA Default Enterprise)

Test 5.1: Live consumer usage insert with organization_id = NULL...
✓ Live consumer record created: ID=95da42a3-f9f7-4120-9c57-6cc89de6c763, org=null

Test 5.2: Live B2B usage insert with valid organization_id...
✓ Live B2B record created: ID=3018708a-074d-4d64-bbfc-12ee91aac982, org=00000000-0000-0000-0000-000000000001

Test 5.3: Verifying invalid organization_id rejection on live staging...
✓ FK rejection confirmed: code=23503 (insert or update on table "ai_usage_analytics" violates foreign key constraint "ai_usage_analytics_organization_id_fkey")

Test 5.4: Verifying query isolation...
✓ B2B query excludes consumer usage.
✓ Consumer query isolates to authenticated user consumer records.
✓ Ephemeral test records cleaned up cleanly.
```

### 5.5. Migration Idempotency Test
Re-running the runner on staging for both migrations confirmed zero duplicate mutations:
- `apply_staging_migrations.js phase_12_legacy_routine_hardening.sql` -> `[SKIP] Already executed` (0 applied, Exit Code 0).
- `apply_staging_migrations.js phase_12b_consumer_analytics_persistence.sql` -> `[SKIP] Already executed` (0 applied, Exit Code 0).

---

## 6. Post-Deployment Test Suite & Build Verification

| Verification Suite | Scope / Command | Result |
| :--- | :--- | :---: |
| **Phase 12B Security Suite** | `npm --workspace backend test -- tests/security/phase12b_analytics_persistence.security.test.ts` | **13 / 13 PASS (100%)** |
| **Phase 12A Security Suite** | `npm --workspace backend test -- tests/security/phase12a_routine_hardening.security.test.ts` | **10 / 10 PASS (100%)** |
| **Chatbot Audit Suite** | `npm --workspace backend test -- tests/security/ai_chatbot_audit_remediation.security.test.ts` | **6 / 6 PASS (100%)** |
| **Backend Unit Test Suite** | `npm --workspace backend test -- tests/unit/` | **84 / 84 PASS (100%)** |
| **Full Security Test Suite** | `npm --workspace backend test -- tests/security/` (36 test files) | **587 / 587 PASS (100%)** |
| **Backend TypeScript Build** | `npm --workspace backend run build` (`tsc && tsc-alias`) | **0 Errors (Exit Code 0)** |
| **Frontend Production Build** | `npm run build:frontend` (`vite build`) | **0 Errors (Exit Code 0)** |
| **Full Workspace Build** | `npm run build` | **0 Errors (Exit Code 0)** |

---

## 7. Production Isolation & Remaining Blockers

1. **Production Safety Invariant:**
   - The production database was **never accessed, connected to, or modified**.
   - All connection strings, credentials, and network requests targeted strictly `db.ymrblyiwohvxptiqjfsi.supabase.co:5432`.
2. **Working Tree Safety:**
   - All 45 modified UI components in `src/` remain intact.
   - Zero untracked files or scratch test scripts were lost or altered.
3. **Remaining Blockers:**
   - **None.** Phase 12 and Phase 12B are fully deployed, independently verified, regression-tested, and operational on the authorized STRIVA V2 staging environment.

---

## Final Deployment Verdict

```
PHASE 12 & 12B STAGING DEPLOYMENT COMPLETE & VERIFIED
```
