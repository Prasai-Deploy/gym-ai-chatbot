# STRIVA V2 — Phase 12A: Legacy Routine Security Hardening Rehearsal Report

**Document Version:** 1.0.0  
**Date / Local Time:** 2026-10-14 14:35 IST  
**Target Staging Project:** `ymrblyiwohvxptiqjfsi` (Untouched)  
**Host Target:** `db.ymrblyiwohvxptiqjfsi.supabase.co:5432`  
**Current Staging Baseline:** Exactly 26 migrations recorded in `public._migrations`  
**Local Test Environment:** Isolated disposable PostgreSQL 18.3 cluster on `127.0.0.1:5433`  
**Remote DDL/DML Applied in this Phase:** Strictly 0 (Local preparation and testing only)  
**Production Database Status:** Untouched & Protected  
**Working Tree Status:** All 45 modified files in `src/` and untracked artifacts strictly preserved  
**Phase Verdict:** **PHASE 12A REHEARSAL PASSED — MIGRATION SPECIFICATION READY**

---

## 1. Executive Summary

In Phase 11 / DB-5O, a catalog audit identified the remaining five unhardened legacy PostgreSQL routines in the `public` schema. In **Phase 12A**, a minimal, explicit, and reviewable migration file was authored and verified against an isolated, restored PostgreSQL 18.3 database (`striva_restore_test` on `127.0.0.1:5433`):

- **Target Migration File Created:** `backend/supabase/migrations/phase_12_legacy_routine_hardening.sql`
- **Automated Security Test Suite Created:** `backend/tests/security/phase12a_routine_hardening.security.test.ts`
- **Full Security Test Suite:** 34 test files, **568 of 568 tests passing (100%)**
- **Unit Test Suite:** 7 test files, **84 of 84 tests passing (100%)**
- **Workspace Build (`npm run build`):** Vite frontend + TypeScript backend compiled with **Exit Code 0**

---

## 2. Hardened Routine Specifications & Execution Mode Matrix

| Routine | Previous Mode | New Mode | `search_path` Config | Effective ACLs | Justification & Verification Evidence |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `public.update_modified_column()` | `INVOKER` | `INVOKER` | `pg_catalog, pg_temp` | `authenticated`, `service_role`, `postgres` (`anon`: NO, `PUBLIC`: NO) | Attached to 11 active core V2 tables (`profiles`, `user_preferences`, etc.). Must remain `SECURITY INVOKER`. Authenticated execution strictly preserved so user profile updates succeed without `42501`. |
| `public.update_updated_at_column()` | `INVOKER` | `INVOKER` | `pg_catalog, pg_temp` | `authenticated`, `service_role`, `postgres` (`anon`: NO, `PUBLIC`: NO) | Attached to legacy tables (`memberships`, `fitness_profiles`, `user_stats`). Must remain `SECURITY INVOKER`. Authenticated execution preserved. |
| `public.update_membership_statuses()` | `INVOKER` | `INVOKER` | `pg_catalog, pg_temp` | `postgres`, `service_role` (`anon`: NO, `authenticated`: NO, `PUBLIC`: NO) | Maintenance routine executed daily at 00:00 UTC by `pg_cron` as `postgres`. Direct PostgREST RPC access revoked from `PUBLIC`, `anon`, and `authenticated` to close external attack surface. Schema-qualifies all 4 tables. |
| `public.is_admin()` | `DEFINER` | `INVOKER` | `pg_catalog, pg_temp` | `authenticated`, `service_role`, `postgres` (`anon`: NO, `PUBLIC`: NO) | Converted to `SECURITY INVOKER` after empirical verification that `public.admins` RLS policy (`Users can check own admin status`) allows authenticated users to read their own status. Eliminates superuser elevation risk. |
| `public.get_admin_role()` | `DEFINER` | `INVOKER` | `pg_catalog, pg_temp` | `authenticated`, `service_role`, `postgres` (`anon`: NO, `PUBLIC`: NO) | Converted to `SECURITY INVOKER`. Pins search path, schema-qualifies `public.admins`, and revokes anonymous public execution. |

---

## 3. Empirical Disposable Database Rehearsal (Port 5433)

### 3.1 Restoration to Baseline 26
1. Fresh database `striva_restore_test` initialized on isolated local PostgreSQL 18.3 (`127.0.0.1:5433`).
2. Supabase cluster roles created (`anon`, `authenticated`, `service_role`, `supabase_auth_admin`, `supabase_admin`, `authenticator`).
3. `auth` schema and helper functions (`auth.uid()`, `auth.jwt()`, `auth.role()`) initialized with `USAGE` granted to standard roles.
4. Baseline 25 restored from `striva_staging_baseline_25_schema.sql`, `striva_staging_baseline_25_auth.sql`, and `striva_staging_baseline_25_data.sql`.
5. DB-5 migration `phase_11_prelaunch_hardening.sql` applied, advancing baseline to exactly 26 migrations.

### 3.2 Application of Phase 12 Migration
- `phase_12_legacy_routine_hardening.sql` applied within an explicit transaction.
- All 5 routines updated cleanly without dropping triggers, tables, or altering RLS policies.
- Catalog query confirmed:
  - `prosecdef = false` (`SECURITY INVOKER`) across all 5 routines.
  - `proconfig = ARRAY['search_path=pg_catalog, pg_temp']` across all 5 routines.

### 3.3 Authorization & Execution Rehearsal Results
1. **Admin Helpers (`is_admin`, `get_admin_role`):**
   - **Authenticated Admin (`priyanshupaswan648@gmail.com`):** Returns `is_admin = true`, `role = 'super_admin'`.
   - **Authenticated Non-Admin (`demo@sweatfix.com`):** Returns `is_admin = false`, `role = NULL`.
   - **Anonymous (`anon`):** Blocked with `ERROR 42501: permission denied for function is_admin`.
   - **Service Role (`service_role`):** Supported with and without simulated user claims.
2. **Maintenance Routine (`update_membership_statuses`):**
   - **Anonymous (`anon`):** Blocked with `ERROR 42501: permission denied for function update_membership_statuses`.
   - **Authenticated User (`authenticated`):** Blocked with `ERROR 42501: permission denied for function update_membership_statuses`.
   - **Platform Superuser (`postgres` / `pg_cron`):** Executes cleanly, returning `void` (1 row) in ~10ms.
   - **Syntax Validation:** Rehearsal verified that standard SQL syntax `CURRENT_DATE` operates correctly with `search_path = pg_catalog, pg_temp`.
3. **Row-Level Timestamp Triggers (`update_modified_column`, `update_updated_at_column`):**
   - **Trigger Firing on `public.profiles`:** An authenticated update (`UPDATE public.profiles SET full_name = 'Verified Name' WHERE id = ...`) fires `update_profiles_modtime`, advancing `updated_at` cleanly without permission errors.
   - **Trigger Firing on `public.memberships`:** An update to `public.memberships` fires `trg_memberships_updated_at`, advancing `updated_at` cleanly.

---

## 4. Test & Build Suite Verification

1. **Phase 12A Dedicated Security Test Suite:**
   - **Command:** `npx vitest run -c backend/vitest.config.ts backend/tests/security/phase12a_routine_hardening.security.test.ts`
   - **Result:** **10 of 10 tests passed (100%)** in 204ms.
2. **Full Security Test Suite (34 Test Files):**
   - **Command:** `npx vitest run -c backend/vitest.config.ts backend/tests/security`
   - **Result:** **568 of 568 tests passed (100%)** in 15.87s.
3. **Backend Unit Test Suite (7 Test Files):**
   - **Command:** `npx vitest run -c backend/vitest.config.ts backend/tests/unit`
   - **Result:** **84 of 84 tests passed (100%)** in 1.72s.
4. **Full Workspace Build:**
   - **Command:** `npm run build`
   - **Result:** **Exit Code 0** (Vite frontend 8.61s; backend `tsc && tsc-alias` clean).

---

## 5. Migration Artifact Reference

The hardened migration is located at:
`backend/supabase/migrations/phase_12_legacy_routine_hardening.sql`

```sql
-- Hash Verification (SHA-256) will be generated in preflight prior to any staging deployment.
```

---

## 6. Safety & Non-Mutation Attestation

- **Remote Staging Project `ymrblyiwohvxptiqjfsi`:** Zero DDL, zero DML, zero RPC execution. Baseline remains exactly 26 migrations.
- **Production Database:** Zero connection, completely untouched.
- **Local Working Tree:** All 45 modified files in `src/` and untracked artifacts preserved.
