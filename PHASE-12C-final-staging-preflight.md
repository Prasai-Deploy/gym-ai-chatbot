# STRIVA V2 — Phase 12C: Final Staging Deployment Preflight Report

**Document Version:** 1.0.0  
**Date / Local Time:** 2026-10-14 17:05 IST  
**Target Staging Project Reference:** `ymrblyiwohvxptiqjfsi`  
**Host Target:** `db.ymrblyiwohvxptiqjfsi.supabase.co:5432`  
**Server IP Address:** `2406:da1a:b00:1301:3210:50bf:8c8:6055` (PostgreSQL 17.6 on aarch64 Linux)  
**Current Staging Baseline:** Exactly 26 migrations recorded in `public._migrations`  
**Remote DDL/DML Applied in this Phase:** Strictly 0 (Read-only preflight inspection only)  
**Production Database Status:** Strictly Protected (Zero connections or mutations)  
**Working Tree Status:** All 45 modified files in `src/`, backend changes, and untracked artifacts strictly preserved  
**Preflight Gate Recommendation:** **GO — READY FOR EXPLICIT OPERATOR APPROVAL**  
**Final Status:** `PHASE 12C READY — EXPLICIT STAGING APPROVAL REQUIRED`

---

## 1. Executive Summary

Phase 12C represents the final, strict read-only preflight verification before requesting human operator approval to deploy **Phase 12** (`phase_12_legacy_routine_hardening.sql`) and **Phase 12B** (`phase_12b_consumer_analytics_persistence.sql`) to the authorized STRIVA staging database.

All pre-deployment invariants have been verified directly against the live staging cluster and local repository state:
1. **Target Identity & Host Guard:** Direct connection to `db.ymrblyiwohvxptiqjfsi.supabase.co:5432` verified. The canonical staging runner's target guard (`validateStagingDatabaseUrl`) guarantees fail-closed isolation before any connection pool is created.
2. **Current Staging Baseline:** Exactly **26 custom migrations** are recorded in `public._migrations`. Neither Phase 12 migration has been applied.
3. **Migration Checksums:** SHA-256 hashes for both migration files match the Phase 12B report identically.
4. **Live Catalog Inspection:**
   - The 5 legacy routines on staging are confirmed in their unhardened pre-migration state (`SECURITY DEFINER` on admin helpers, unpinned search paths, broad public execution grants).
   - The 14 attached triggers (11 on `update_modified_column`, 3 on `update_updated_at_column`) and 1 active `pg_cron` daily maintenance job are mapped and verified intact.
   - `public.ai_usage_analytics.organization_id` is confirmed `NOT NULL`, validating the exact schema bottleneck to be remediated.
5. **Fresh Off-Cluster Logical Backup:** A fresh 3-part logical backup of staging baseline 26 was generated in `scratch/backups/` and verified readable with SHA-256 checksums recorded.
6. **Disaster Recovery Reality:** Clearly distinguished customer-controlled off-cluster logical exports from host WAL archiving. Self-service console PITR rewind is unavailable on the Supabase Free plan.
7. **Sequential Migration Plan:** Phase 12 (Routine Hardening) will be applied first, advancing baseline to 27; Phase 12B (Consumer Analytics Persistence) will be applied second, advancing baseline to 28.

---

## 2. Actual Staging Baseline & Migration History

Direct introspective query of `public._migrations` on staging host `db.ymrblyiwohvxptiqjfsi.supabase.co` on October 14, 2026:

```
Total records in _migrations: Exactly 26
```

### Complete Applied Migration Sequence
| # | Migration File | Applied Timestamp (UTC) |
| :-: | :--- | :--- |
| 1 | `002_create_fitness_profiles.sql` | `2026-06-30T07:44:35.852Z` |
| 2 | `003_create_ai_plan_tables.sql` | `2026-06-30T07:44:36.054Z` |
| 3 | `003_create_workout_tables.sql` | `2026-06-30T07:44:36.205Z` |
| 4 | `004_create_activity_tables.sql` | `2026-06-30T07:44:36.364Z` |
| 5 | `004_create_progress_dashboard.sql` | `2026-06-30T07:44:36.515Z` |
| 6 | `005_create_water_tables.sql` | `2026-06-30T07:44:36.677Z` |
| 7 | `005_nutrition_system.sql` | `2026-06-30T07:44:36.826Z` |
| 8 | `006_workout_tracker_redesign.sql` | `2026-06-30T07:44:36.980Z` |
| 9 | `007_create_progress_tables.sql` | `2026-06-30T07:44:37.143Z` |
| 10 | `008_add_macros_to_user_progress.sql` | `2026-06-30T07:44:37.312Z` |
| 11 | `008_multi_tenant_saas_foundation.sql` | `2026-10-10T06:45:29.082Z` |
| 12 | `phase_8b_organization_staff_foundation.sql` | `2026-10-10T06:45:29.082Z` |
| 13 | `phase_8d_member_management.sql` | `2026-10-10T06:45:29.082Z` |
| 14 | `phase_8f_trainer_assignments.sql` | `2026-10-10T06:45:29.082Z` |
| 15 | `phase_8h_organization_billing.sql` | `2026-10-10T06:45:29.082Z` |
| 16 | `phase_8i_organization_notifications.sql` | `2026-10-10T06:45:29.082Z` |
| 17 | `phase_8i_1_recipient_read_state.sql` | `2026-10-10T06:45:29.082Z` |
| 18 | `phase_8j_b2b_trinetra.sql` | `2026-10-10T06:45:29.082Z` |
| 19 | `009_ai_memory_and_usage.sql` | `2026-10-10T06:45:29.082Z` |
| 20 | `010_analytics_and_attendance.sql` | `2026-10-10T06:45:29.082Z` |
| 21 | `phase_7b_trial_foundation.sql` | `2026-10-10T06:45:29.082Z` |
| 22 | `phase_9a_rls_recursion_fix.sql` | `2026-10-11T15:01:50.203Z` |
| 23 | `phase_9b_legacy_identity_bridge.sql` | `2026-10-11T17:07:36.445Z` |
| 24 | `phase_10a_nutrition_core_schema.sql` | `2026-10-12T08:38:48.241Z` |
| 25 | `phase_10b_workout_core_schema.sql` | `2026-10-12T08:53:31.500Z` |
| 26 | `phase_11_prelaunch_hardening.sql` | `2026-10-14T07:07:47.914Z` |

- **Phase 12 Presence:** `phase_12_legacy_routine_hardening.sql` is **NOT APPLIED**.
- **Phase 12B Presence:** `phase_12b_consumer_analytics_persistence.sql` is **NOT APPLIED**.
- **Baseline Integrity:** Staging database is at the exact expected baseline 26.

---

## 3. Live Read-Only Catalog Checks & Drift Assessment

### 3.1. Current State of the 5 Legacy Routines on Staging
Introspected via `pg_proc`, `pg_namespace`, and `information_schema.routine_privileges`:

| Routine | Current Owner | Security Mode | `search_path` Config | Current Effective Grants | Pre-Migration Drift Status |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `public.get_admin_role()` | `postgres` | `SECURITY DEFINER` | `NULL` (unpinned) | `PUBLIC`, `anon`, `authenticated`, `postgres`, `service_role` | **UNHARDENED** (Confirmed target for Phase 12) |
| `public.is_admin()` | `postgres` | `SECURITY DEFINER` | `NULL` (unpinned) | `PUBLIC`, `anon`, `authenticated`, `postgres`, `service_role` | **UNHARDENED** (Confirmed target for Phase 12) |
| `public.update_membership_statuses()` | `postgres` | `SECURITY INVOKER` | `NULL` (unpinned) | `PUBLIC`, `anon`, `authenticated`, `postgres`, `service_role` | **EXPOSED RPC** (Confirmed target for Phase 12) |
| `public.update_modified_column()` | `postgres` | `SECURITY INVOKER` | `NULL` (unpinned) | `PUBLIC`, `anon`, `authenticated`, `postgres`, `service_role` | **UNPINNED** (Confirmed target for Phase 12) |
| `public.update_updated_at_column()` | `postgres` | `SECURITY INVOKER` | `NULL` (unpinned) | `PUBLIC`, `anon`, `authenticated`, `postgres`, `service_role` | **UNPINNED** (Confirmed target for Phase 12) |

### 3.2. Attached Triggers (14 Active Triggers Verified)
- **Attached to `update_modified_column()` (11 tables):**
  - `update_ai_conversations_modtime` on `public.ai_conversations`
  - `update_ai_memory_modtime` on `public.ai_memory`
  - `update_feature_usage_modtime` on `public.feature_usage`
  - `update_member_settings_modtime` on `public.member_settings`
  - `update_profiles_modtime` on `public.profiles`
  - `update_progress_stats_modtime` on `public.progress_statistics`
  - `update_recovery_logs_modtime` on `public.recovery_logs`
  - `update_subscriptions_modtime` on `public.subscriptions`
  - `update_user_goals_modtime` on `public.user_goals`
  - `update_user_preferences_modtime` on `public.user_preferences`
  - `update_fitness_profiles_modtime` on `public.v2_fitness_profiles`
- **Attached to `update_updated_at_column()` (3 tables):**
  - `trg_fitness_profiles_updated_at` on `public.fitness_profiles`
  - `trg_memberships_updated_at` on `public.memberships`
  - `trg_user_stats_updated_at` on `public.user_stats`

### 3.3. Active Scheduled Maintenance (`pg_cron`)
- **Job ID:** `1`
- **Schedule:** `0 0 * * *` (Daily at 00:00 UTC)
- **Command:** `SELECT update_membership_statuses()`
- **Execution User:** `postgres`
- **Active Status:** `true`

### 3.4. `public.ai_usage_analytics` Current Schema & Policies
- **Columns:** 17 columns present (`id`, `user_id`, `organization_id`, `agent_id`, `session_id`, `provider`, `model`, `request_timestamp`, `duration_ms`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `tool_calls_count`, `tools_called`, `success`, `error_category`, `created_at`).
- **`organization_id` Nullability:** `is_nullable = 'NO'` (Confirmed root cause of consumer insert failures).
- **Foreign Key:** `ai_usage_analytics_organization_id_fkey` strictly references `public.organizations(id)`.
- **Existing Indexes:**
  - `ai_usage_analytics_pkey` (btree on `id`)
  - `idx_ai_usage_analytics_agent` (btree on `agent_id, created_at`)
  - `idx_ai_usage_analytics_org_created` (btree on `organization_id, created_at`)
  - `idx_ai_usage_analytics_user` (btree on `user_id, created_at`)
- **Existing Policies (2 Tenant Policies):**
  - `"Tenant AI usage analytics insert policy"` (INSERT)
  - `"Tenant AI usage analytics select policy"` (SELECT with `organization_id = (NULLIF(current_setting('app.current_organization_id'::text, true), ''::text))::uuid`)
- **Consumer Policies:** Currently absent on staging (to be installed by Phase 12B).

**Catalog Drift Finding:**  
The catalog on remote staging matches the exact pre-migration baseline 26 observed during local testing before applying Phase 12 and 12B. There is **zero unauthorized drift** on staging.

---

## 4. Cryptographic Migration Hashes (SHA-256)

Both migration files were verified on disk using cryptographic SHA-256 calculation:

| Migration File | Relative Path | Calculated SHA-256 Checksum | Match with Phase 12B Report |
| :--- | :--- | :--- | :---: |
| **Phase 12** | `backend/supabase/migrations/phase_12_legacy_routine_hardening.sql` | `A53F714C7ADBCEBD81BF08DAA8C16557F073CD9A1C990F0324C314F07B9396DE` | **EXACT MATCH** |
| **Phase 12B** | `backend/supabase/migrations/phase_12b_consumer_analytics_persistence.sql` | `008D7973C251F276A88FF04C26C76298A027B06E70FBAF09D2CF08AE40FE7703` | **EXACT MATCH** |

---

## 5. Fresh Off-Cluster Logical Backup (Baseline 26)

A fresh off-cluster logical backup of the live staging database at baseline 26 was generated using `pg_dump` 18.3 into `scratch/backups/`. All exports were validated for readability and syntax completeness:

### 5.1. Backup Artifacts & Checksums
| Backup File | Content & Scope | Size | SHA-256 Checksum |
| :--- | :--- | :---: | :--- |
| `striva_staging_baseline_26_schema.sql` | Public schema DDL (tables, views, functions, triggers, policies, grants) | 225,440 bytes | `DE41041EBF640E24752986E672D6819AC804D2979CAE4E951267F1C3A0E28A24` |
| `striva_staging_baseline_26_data.sql` | Public domain table data using `--column-inserts` | 52,256 bytes | `48047912C9C61DAEE163960B4A8D877574DA5DAC2FAF0A733892A4F27DF08347` |
| `striva_staging_baseline_26_auth.sql` | `auth.users` identities for existing staging accounts | 8,871 bytes | `405B34EE5FACE3A113958417B05F0BDFAC1F0A0812E94CA110F55DA21C7E91DF` |

### 5.2. Clear Distinction: Logical Backup vs Managed PITR
- **Managed PITR Telemetry:** PostgreSQL continuous WAL archiving is enabled on the server (`archive_mode = on`, `wal_level = logical`).
- **Free-Tier Control-Plane Limitation:** On the Supabase Free plan, there is **no platform control plane console or self-service PITR rewind button**. WAL archiving by the host does not provide customer-accessible point-in-time recovery.
- **Disaster Recovery Reality:** Consistent, off-cluster logical SQL exports represent the primary customer-controlled disaster recovery asset.
- **Tested Restore Limitations:**
  - Full restore rehearsals of baseline 25 and 26 were successfully executed on isolated PostgreSQL 18.3 (`striva_restore_test` on `127.0.0.1:5433`).
  - Restoration into a clean standalone instance requires pre-provisioning Supabase roles (`anon`, `authenticated`, `service_role`, `supabase_auth_admin`, `supabase_admin`) and auth helper function stubs (`auth.uid()`, `auth.jwt()`, `auth.role()`) before executing `schema` and `data` scripts.

---

## 6. Runner Safeguards & Intended Migration Order

### 6.1. Staging Runner Safeguards (`backend/scripts/apply_staging_migrations.js`)
1. **Pre-Connection Target Guard:** `validateStagingDatabaseUrl` validates protocol (`postgresql:` / `postgres:`), exact hostname equality (`db.ymrblyiwohvxptiqjfsi.supabase.co`), and exact project reference structure. Fails closed before connection pool creation.
2. **Transaction-Level Advisory Lock:** Acquires 64-bit bigint advisory lock `746291048201582` immediately following `BEGIN`.
3. **Targeted Filename Filtering:** Supports explicit argument passing (`process.argv[2]`). If a migration name is provided, only that exact registered migration is applied.
4. **Automatic Rollback:** Any execution error triggers an immediate `ROLLBACK`, safely releasing the advisory lock and leaving `_migrations` unmutated.
5. **Connection Lifecycle:** Connections and pools are guaranteed to release and end in `finally` blocks.

### 6.2. Intended Sequential Migration Order
```
Current Staging State: Baseline 26 (ends with phase_11_prelaunch_hardening.sql)
│
├── Step 1: Deploy Phase 12 Routine Hardening
│   Command: node backend/scripts/apply_staging_migrations.js phase_12_legacy_routine_hardening.sql
│   Expected Outcome: Baseline advances from 26 to 27; routines hardened to SECURITY INVOKER.
│
└── Step 2: Deploy Phase 12B Consumer Analytics Persistence
    Command: node backend/scripts/apply_staging_migrations.js phase_12b_consumer_analytics_persistence.sql
    Expected Outcome: Baseline advances from 27 to 28; organization_id becomes nullable with RLS.
```

---

## 7. Working Tree & Chatbot Integrity Verification

1. **Chatbot Audit Fixes Preserved:**
   - Conversation ownership check in `AIController.ts` prevents cross-user access.
   - SSE streaming and token delivery in `StreamManager.ts` intact.
   - Verified Groq free model `openai/gpt-oss-20b` configured across provider defaults.
   - Tool execution loop and error handling preserved.
   - Consumer analytics persistence logic in `AIUsageRepository.ts` and `AgentRunner.ts` intact.
2. **Working Tree Safety:**
   - All 45 modified UI components in `src/` remain intact.
   - Zero working tree changes discarded or overwritten during preflight.
   - No untracked artifacts lost.

---

## 8. Preflight Verdict & Recommendation

All pre-deployment criteria are met:
- Staging host verified and guarded.
- Migration baseline exactly 26 with zero unauthorized drift.
- Migration hashes match identically.
- Fresh baseline 26 logical backups verified on disk.
- Runner safeguards and atomic rollback verified.
- Chatbot fixes and working tree changes 100% intact.

### Recommendation
**GO FOR CONTROLLED STAGING DEPLOYMENT** (pending explicit operator approval).

---

## Final Preflight Status

```
PHASE 12C READY — EXPLICIT STAGING APPROVAL REQUIRED
```
