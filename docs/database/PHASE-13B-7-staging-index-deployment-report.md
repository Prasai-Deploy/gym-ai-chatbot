# STRIVA V2 — Phase 13B-7: Authorized Staging Index Deployment Report

**Document ID:** `PHASE-13B-7`  
**Execution Date:** 2026-10-15  
**Target Environment:** Staging Database (`db.ymrblyiwohvxptiqjfsi.supabase.co:5432` / Project Ref: `ymrblyiwohvxptiqjfsi`)  
**Migration Artifact:** [`backend/supabase/migrations/phase_13b_foreign_key_indexes.sql`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/supabase/migrations/phase_13b_foreign_key_indexes.sql)  
**Migration Runner:** [`backend/scripts/apply_staging_migrations.js`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/scripts/apply_staging_migrations.js)  
**Verification Script:** [`scratch/verify_phase13b7_staging_deployment.cjs`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/scratch/verify_phase13b7_staging_deployment.cjs)  
**Authorization Status:** Authorized by User for Staging Project `ymrblyiwohvxptiqjfsi` Only  
**Production Isolation:** **STRICT PASS** — Production was not contacted, connected to, or modified in any way  
**Final Status:** `PHASE 13B-7 PASS — STAGING DEPLOYMENT VERIFIED`

---

## 1. Executive Summary

Phase 13B-7 successfully deployed the reviewed foreign-key index hardening migration ([`phase_13b_foreign_key_indexes.sql`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/supabase/migrations/phase_13b_foreign_key_indexes.sql)) to the authorized STRIVA V2 staging project (`ymrblyiwohvxptiqjfsi`).

The deployment was executed through the canonical guarded runner ([`backend/scripts/apply_staging_migrations.js`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/scripts/apply_staging_migrations.js)) inside an atomic transaction guarded by 64-bit advisory lock `746291048201582` and TLS enforcement.

Post-deployment live verification confirmed:
1. Migration history advanced from **28 to 29**, with `phase_13b_foreign_key_indexes.sql` appearing exactly once.
2. All **16 expected indexes** exist in `pg_index` with `indisvalid = true`, correct table targets, correct column orders, descending sort on audit logs, and null-filtered partial predicates.
3. **0 invalid indexes** exist across the entire `public` schema.
4. All **16 foreign-key constraints** remain intact with unmodified delete rules.
5. All local automated regression suites passed:
   - Backend Security Suite: **39 test files passed, 643 tests passed, 0 failed**.
   - Backend Unit Suite: **7 test files passed, 84 tests passed, 0 failed**.
   - Backend TypeScript build (`tsc && tsc-alias`): **Exit code 0**.
   - Workspace build (`npm run build`): **Exit code 0**.

---

## 2. Gate 1 — Artifact Verification

The migration artifact was verified directly from the canonical migrations directory prior to registration and execution.

| Attribute | Specification / Expected | Observed / Verified | Status |
|---|---|---|---|
| **Relative Path** | `backend/supabase/migrations/phase_13b_foreign_key_indexes.sql` | `backend/supabase/migrations/phase_13b_foreign_key_indexes.sql` | **MATCH** |
| **File Size** | 6,823 bytes | 6,823 bytes | **MATCH** |
| **Line Count** | 128 lines | 128 lines | **MATCH** |
| **Algorithm** | SHA-256 | SHA-256 | **MATCH** |
| **Approved Hash** | `3F42636FCAF2333D50FE479BCE1BBD695F88B17B515754FCAA5965CA8459EE3F` | `3F42636FCAF2333D50FE479BCE1BBD695F88B17B515754FCAA5965CA8459EE3F` | **EXACT MATCH** |
| **DDL Invariants** | Exactly 16 `CREATE INDEX IF NOT EXISTS` | 16 statements, 0 mutating DML statements | **VERIFIED** |

---

## 3. Gate 2 — Safe Runner Registration & Local Test Verification

The canonical migration runner [`backend/scripts/apply_staging_migrations.js`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/scripts/apply_staging_migrations.js) was safely updated to register `phase_13b_foreign_key_indexes.sql`.

### 3.1 Safeguards Preserved
- **Target Host Validation:** `validateStagingDatabaseUrl()` strictly requires hostname `db.ymrblyiwohvxptiqjfsi.supabase.co` and project reference `ymrblyiwohvxptiqjfsi`.
- **TLS Enforcement:** Strict TLS requirement before TCP handshake.
- **Transactional Advisory Lock:** `SELECT pg_advisory_xact_lock(746291048201582)` acquired inside transaction before migration eligibility checks.
- **Atomic Transaction:** `BEGIN ... COMMIT` wrapping DDL execution and `_migrations` insertion.
- **Fail-Closed Target Mode:** Invocations with `process.argv[2]` filter the migration queue strictly to that file; if unregistered, throws error, rolls back transaction, releases advisory lock, and exits with code 1.

### 3.2 Local Registration Test Results
Local security tests were executed to verify host guard and registration behavior before attempting remote connection:
- Test suite: [`backend/tests/security/db5k_staging_target_guard.security.test.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/tests/security/db5k_staging_target_guard.security.test.ts)
- Total tests: **19 / 19 passed** (Exit Code: 0)
  - TEST 1–3: Valid staging URL acceptance
  - TEST 4–13: Production host, localhost, subdomain, typosquatting, and evasion rejection
  - TEST 14–16: Pre-connection invariant, advisory lock `746291048201582`, atomic transaction block
  - TEST 17: Baseline migration registration
  - TEST 18: `phase_13b_foreign_key_indexes.sql` registered at index 18 (19th item)
  - TEST 19: Unregistered target migration files rejected

---

## 4. Gate 3 — Live Staging Preflight Execution & Verification

Immediately before deployment, a live, read-only preflight check was executed via [`scratch/phase13b6_staging_preflight.cjs`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/scratch/phase13b6_staging_preflight.cjs).

| Preflight Check | Target Criteria | Observed Live Staging State | Result |
|---|---|---|---|
| **Target Host** | `db.ymrblyiwohvxptiqjfsi.supabase.co` | `db.ymrblyiwohvxptiqjfsi.supabase.co` (Port 5432) | **PASS** |
| **Project Ref** | `ymrblyiwohvxptiqjfsi` | `ymrblyiwohvxptiqjfsi` | **PASS** |
| **Database Engine** | PostgreSQL 17.x | `PostgreSQL 17.6 on aarch64-unknown-linux-gnu` | **PASS** |
| **Migration Baseline** | Exactly 28 | `SELECT count(*)::int FROM _migrations` = 28 | **PASS** |
| **Latest Staging Migration** | `phase_12b_consumer_analytics_persistence.sql` | `phase_12b_consumer_analytics_persistence.sql` (2026-10-14T11:49:01.899Z) | **PASS** |
| **Phase 13B History Check** | Unrecorded (0) | `SELECT count(*) FROM _migrations WHERE name LIKE '%13b%'` = 0 | **PASS** |
| **Proposed Index Collisions** | 0 existing | `SELECT indexname FROM pg_indexes WHERE indexname = ANY(...)` = 0 | **PASS** |
| **FK Constraints Matching** | 16/16 verified with cascade rules | 16/16 introspected in `pg_constraint` with matching definitions | **PASS** |
| **Table Telemetry** | Active tables verified | All 14 candidate tables inspected (<150 kB total size each) | **PASS** |
| **Backup Integrity** | 3 Baseline-28 archives | `striva_staging_baseline_28_{auth,data,schema}.sql` verified | **PASS** |

All preflight gates passed with zero schema drift.

---

## 5. Gate 4 — Canonical Runner Staging Deployment

The deployment was applied exclusively using the authorized canonical runner.

### 5.1 Invocation Command
```bash
node backend/scripts/apply_staging_migrations.js phase_13b_foreign_key_indexes.sql
```

### 5.2 Command Exit Status
- **Exit Code:** `0` (Success)

### 5.3 Execution Logs (Sanitized)
```text
=== STRIVA V2 STAGING MIGRATION RUNNER ===
[GUARD] Verifying target database host and project identity...
[GUARD] Target verified: Project "ymrblyiwohvxptiqjfsi" on host "db.ymrblyiwohvxptiqjfsi.supabase.co".
[LOCK] Acquiring transaction-level migration advisory lock...
[LOCK] Migration advisory lock acquired successfully.
[TARGET MODE] Applying strictly specified migration: phase_13b_foreign_key_indexes.sql
[APPLYING] phase_13b_foreign_key_indexes.sql...
[SUCCESS] phase_13b_foreign_key_indexes.sql

✓ Successfully committed 1 migrations to staging database.
Total public tables now: 100
Verified core tables: [
  'attendance_logs',
  'organization_audit_logs',
  'organization_billing_accounts',
  'organization_branding',
  'organization_invitations',
  'organization_invoices',
  'organization_locations',
  'organization_members',
  'organization_notification_reads',
  'organization_notifications',
  'organization_payment_events',
  'organization_permissions',
  'organization_roles',
  'organization_settings',
  'organization_staff',
  'organization_subscription_plans',
  'organization_subscriptions',
  'organizations',
  'push_subscriptions',
  'subscriptions',
  'trainer_member_assignments'
]
```

---

## 6. Gate 5 — Live Post-Deployment Verification

Live database verification was executed via [`scratch/verify_phase13b7_staging_deployment.cjs`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/scratch/verify_phase13b7_staging_deployment.cjs) with strictly read-only queries against `db.ymrblyiwohvxptiqjfsi.supabase.co`.

### 6.1 Migration History Verification
- **Pre-Deployment Baseline:** 28
- **Post-Deployment Count:** Exactly **29**
- **Phase 13B Record Count:** Exactly **1**
- **Recorded Migration Name:** `phase_13b_foreign_key_indexes.sql`
- **Execution Timestamp:** `Thu Oct 15 2026 19:56:44 GMT+0530 (India Standard Time)`

### 6.2 Per-Index Verification Matrix (All 16 Indexes)

All 16 indexes were introspected in `pg_index`, `pg_class`, and `pg_namespace`:

| ID | Index Name | Target Table | Valid (`indisvalid`) | Ready (`indisready`) | Live Index Definition in PostgreSQL |
|---|---|---|---|---|---|
| `IDX-01` | `idx_ai_messages_conversation_id` | `ai_messages` | `true` | `true` | `CREATE INDEX idx_ai_messages_conversation_id ON public.ai_messages USING btree (conversation_id, created_at)` |
| `IDX-02` | `idx_ai_tool_executions_conversation_id` | `ai_tool_executions` | `true` | `true` | `CREATE INDEX idx_ai_tool_executions_conversation_id ON public.ai_tool_executions USING btree (conversation_id)` |
| `IDX-03` | `idx_organization_locations_organization_id` | `organization_locations` | `true` | `true` | `CREATE INDEX idx_organization_locations_organization_id ON public.organization_locations USING btree (organization_id)` |
| `IDX-04` | `idx_organization_roles_organization_id` | `organization_roles` | `true` | `true` | `CREATE INDEX idx_organization_roles_organization_id ON public.organization_roles USING btree (organization_id)` |
| `IDX-05` | `idx_org_audit_logs_org_created` | `organization_audit_logs` | `true` | `true` | `CREATE INDEX idx_org_audit_logs_org_created ON public.organization_audit_logs USING btree (organization_id, created_at DESC)` |
| `IDX-06` | `idx_trainer_assignments_member_user_id` | `trainer_member_assignments` | `true` | `true` | `CREATE INDEX idx_trainer_assignments_member_user_id ON public.trainer_member_assignments USING btree (member_user_id)` |
| `IDX-07` | `idx_trainer_assignments_trainer_user_id` | `trainer_member_assignments` | `true` | `true` | `CREATE INDEX idx_trainer_assignments_trainer_user_id ON public.trainer_member_assignments USING btree (trainer_user_id)` |
| `IDX-08` | `idx_attendance_logs_location_id` | `attendance_logs` | `true` | `true` | `CREATE INDEX idx_attendance_logs_location_id ON public.attendance_logs USING btree (location_id) WHERE (location_id IS NOT NULL)` |
| `IDX-09` | `idx_org_members_location_id` | `organization_members` | `true` | `true` | `CREATE INDEX idx_org_members_location_id ON public.organization_members USING btree (location_id) WHERE (location_id IS NOT NULL)` |
| `IDX-10` | `idx_org_staff_location_id` | `organization_staff` | `true` | `true` | `CREATE INDEX idx_org_staff_location_id ON public.organization_staff USING btree (location_id) WHERE (location_id IS NOT NULL)` |
| `IDX-11` | `idx_ai_tool_executions_user_id` | `ai_tool_executions` | `true` | `true` | `CREATE INDEX idx_ai_tool_executions_user_id ON public.ai_tool_executions USING btree (user_id)` |
| `IDX-12` | `idx_ai_agent_memories_organization_id` | `ai_agent_memories` | `true` | `true` | `CREATE INDEX idx_ai_agent_memories_organization_id ON public.ai_agent_memories USING btree (organization_id)` |
| `IDX-13` | `idx_v2_workout_sessions_plan_id` | `v2_workout_sessions` | `true` | `true` | `CREATE INDEX idx_v2_workout_sessions_plan_id ON public.v2_workout_sessions USING btree (plan_id) WHERE (plan_id IS NOT NULL)` |
| `IDX-14` | `idx_invoices_subscription_id` | `invoices` | `true` | `true` | `CREATE INDEX idx_invoices_subscription_id ON public.invoices USING btree (subscription_id) WHERE (subscription_id IS NOT NULL)` |
| `IDX-15` | `idx_org_invoices_subscription_id` | `organization_invoices` | `true` | `true` | `CREATE INDEX idx_org_invoices_subscription_id ON public.organization_invoices USING btree (subscription_id) WHERE (subscription_id IS NOT NULL)` |
| `IDX-16` | `idx_org_subs_plan_id` | `organization_subscriptions` | `true` | `true` | `CREATE INDEX idx_org_subs_plan_id ON public.organization_subscriptions USING btree (plan_id) WHERE (plan_id IS NOT NULL)` |

### 6.3 Schema-Wide Index Validity Check
- Query: `SELECT count(*) FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND i.indisvalid = false`
- **Invalid Indexes in Schema `public`:** **0**

### 6.4 Foreign-Key Constraint Integrity
All 16 foreign keys remain active and intact on the live staging database:
- `ai_messages.ai_messages_conversation_id_fkey` -> `ON DELETE CASCADE` ✓
- `ai_tool_executions.ai_tool_executions_conversation_id_fkey` -> `ON DELETE CASCADE` ✓
- `organization_locations.organization_locations_organization_id_fkey` -> `ON DELETE CASCADE` ✓
- `organization_roles.organization_roles_organization_id_fkey` -> `ON DELETE CASCADE` ✓
- `organization_audit_logs.organization_audit_logs_organization_id_fkey` -> `ON DELETE CASCADE` ✓
- `trainer_member_assignments.trainer_member_assignments_member_user_id_fkey` -> `ON DELETE CASCADE` ✓
- `trainer_member_assignments.trainer_member_assignments_trainer_user_id_fkey` -> `ON DELETE CASCADE` ✓
- `attendance_logs.attendance_logs_location_id_fkey` -> `ON DELETE SET NULL` ✓
- `organization_members.organization_members_location_id_fkey` -> `ON DELETE SET NULL` ✓
- `organization_staff.organization_staff_location_id_fkey` -> `ON DELETE SET NULL` ✓
- `ai_tool_executions.ai_tool_executions_user_id_fkey` -> `ON DELETE CASCADE` ✓
- `ai_agent_memories.ai_agent_memories_organization_id_fkey` -> `ON DELETE CASCADE` ✓
- `v2_workout_sessions.v2_workout_sessions_plan_id_fkey` -> `ON DELETE SET NULL` ✓
- `invoices.invoices_subscription_id_fkey` -> `ON DELETE SET NULL` ✓
- `organization_invoices.organization_invoices_subscription_id_fkey` -> `ON DELETE SET NULL` ✓
- `organization_subscriptions.organization_subscriptions_plan_id_fkey` -> `ON DELETE SET NULL` ✓

### 6.5 Performance Advisor & Query Statistics Telemetry
- Extension `pg_stat_statements` is active on staging.
- With the creation of these 16 foreign-key indexes, all 16 relations that formerly triggered foreign-key sequential scans on delete/update cascades now utilize btree index lookups.

---

## 7. Local Test Suites & Build Verification

Every automated test suite and production build was executed and recorded:

| Verification Scope | Command | Results | Exit Code | Status |
|---|---|---|---|---|
| **Staging Target Guard Tests** | `npm --workspace backend test -- tests/security/db5k_staging_target_guard.security.test.ts` | 19 / 19 passed | `0` | **PASS** |
| **Backend Security Test Suite** | `npm --workspace backend test -- tests/security` | 39 test files passed, 643 tests passed, 0 failed | `0` | **PASS** |
| **Backend Unit Test Suite** | `npm --workspace backend test -- tests/unit` | 7 test files passed, 84 tests passed, 0 failed | `0` | **PASS** |
| **Backend TypeScript Build** | `npm --workspace backend run build` | `tsc && tsc-alias` clean | `0` | **PASS** |
| **Workspace Build (Full)** | `npm run build` | Frontend `vite build` + Backend `tsc && tsc-alias` clean | `0` | **PASS** |

---

## 8. Safety & Operational Confirmation

1. **Production Isolation:** Production was never accessed, referenced, or modified. All activities were strictly confined to staging project `ymrblyiwohvxptiqjfsi`.
2. **Data & Schema Integrity:** No tables, columns, constraints, or policies were dropped or altered. No application records were mutated or deleted.
3. **Advisory Lock Safety:** Runner acquired and released PostgreSQL advisory lock `746291048201582` within the transaction block.
4. **Logical Backups vs. Managed PITR Statement:** The logical backups generated in `scratch/backups/` provide reproducible schema restoration, but do not replace managed continuous Point-in-Time Recovery (PITR). Staging resilience during migration relied on PostgreSQL transactional DDL atomicity (`BEGIN ... COMMIT / ROLLBACK`).

---

## 9. Final Status Declaration

```
========================================================================================
FINAL STATUS: PHASE 13B-7 PASS — STAGING DEPLOYMENT VERIFIED
========================================================================================
```
