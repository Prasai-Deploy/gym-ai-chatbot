# STRIVA V2 — DB-3I: Phase 9B Staging Deployment Report

**Document Version:** 1.0.0  
**Deployment Date:** 2026-10-11  
**Target Migration:** `backend/supabase/migrations/phase_9b_legacy_identity_bridge.sql`  
**Target Staging Project:** `ymrblyiwohvxptiqjfsi` (`db.ymrblyiwohvxptiqjfsi.supabase.co`)  
**Deployment Runner:** `backend/scripts/apply_staging_migrations.js` (Targeted Mode)  
**Execution Status:** **`SUCCESS (DEPLOYED & VERIFIED)`**  
**Pre-Migration Checkpoint:** `striva_staging_checkpoint_pre_phase9b_2026-10-11T15-59-17-893Z.sql` (SHA-256 Verified)  

---

## 1. Executive Summary & Authorization Scope

Under explicit operator authorization, migration `phase_9b_legacy_identity_bridge.sql` was deployed exclusively to the STRIVA V2 staging project (`ymrblyiwohvxptiqjfsi`).

### Key Deployment Achievements
1. **Targeted Advisory Lock Execution**: The targeted migration runner successfully acquired transaction-level advisory lock `746291048201582`, isolated execution strictly to Phase 9B, applied all DDL/DML, and committed atomically.
2. **Deterministic Dual-Factor Bridge Established**: Table `public.legacy_user_id_map` was created and seeded with exactly the two dual-factor verified identities:
   - Legacy User `148` $\longleftrightarrow$ Profile UUID `b96c0b60-9a8b-496f-9e33-f533982412f6`
   - Legacy User `151` $\longleftrightarrow$ Profile UUID `2dbbad1d-5988-4d6f-8c32-5c57080e56f5`
3. **Historical Data Zero-Loss Preservation**: All 13 original hydration rows in `public.water_logs` remain intact. Volume field `amount_ml` was backfilled with 100% completeness (0 NULL rows).
4. **Preservation of Unmapped Accounts**:
   - User `153` retains all 12 historical rows with `profile_id = NULL`.
   - User `147` retains 1 historical row with `profile_id = NULL` pending manual operator attestation.
   - Omitted legacy IDs (147, 149, 150, 152, 153) were confirmed completely absent from the bridge mapping.
5. **Bidirectional Compatibility Trigger Proven**: Live transactional behavioral testing confirmed that modern mapped writes, unmapped net-new writes, legacy writes, and volume boundary constraints operate with zero statement recursion.
6. **Strict Privilege & Security Boundary**: RLS enabled across all affected tables. Access revoked from `PUBLIC` and `anon`; authenticated and service-role policies enforced.

> [!IMPORTANT]
> **Strict Execution Boundary**:
> - Deployed to **staging only** (`ymrblyiwohvxptiqjfsi`).
> - No production databases or configurations were accessed or altered.
> - No claim of production readiness is made.
> - **DB-4 has NOT started.**

---

## 2. Pre-Execution Validation Gates

Prior to running the migration, four safety checks were performed:

| Check | Requirement | Verification Finding | Status |
| :--- | :--- | :--- | :--- |
| **1. Target Project & Unapplied State** | Confirm project reference and verify Phase 9B not applied | Connected to `db.ymrblyiwohvxptiqjfsi.supabase.co`. Checked `_migrations`: 22 migrations present; `phase_9b_legacy_identity_bridge.sql` absent. | **PASS** |
| **2. Pre-Migration Checkpoint Integrity** | Verify logical export exists and matches manifest | Checkpoint `striva_staging_checkpoint_pre_phase9b_2026-10-11T15-59-17-893Z.sql` verified with SHA-256 `36854e617f6a597940942784c9cccc36b529a97759b92040693da4a076e9c2d9` matching manifest. | **PASS** |
| **3. Runner Isolation** | Verify runner executes only targeted migration | Runner script [`backend/scripts/apply_staging_migrations.js`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/scripts/apply_staging_migrations.js) evaluated `targetFile` parameter, filtering queue to strictly `['phase_9b_legacy_identity_bridge.sql']`. | **PASS** |
| **4. Hardened Recovery Runbook** | Confirm recovery archive preserves all modern fields | Hardened archival query `WHERE profile_id IS NOT NULL OR user_id IS NULL` and classification provenance codified in [`DB-3H-archive-completeness-gate.md`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/docs/database/DB-3H-archive-completeness-gate.md). | **PASS** |

---

## 3. Deployment Execution

### Executed Command
```bash
node backend/scripts/apply_staging_migrations.js phase_9b_legacy_identity_bridge.sql
```

### Execution Log Output (Redacted)
```
=== STRIVA V2 STAGING MIGRATION RUNNER ===
[LOCK] Acquiring transaction-level migration advisory lock...
[LOCK] Migration advisory lock acquired successfully.
[TARGET MODE] Applying strictly specified migration: phase_9b_legacy_identity_bridge.sql
[APPLYING] phase_9b_legacy_identity_bridge.sql...
[SUCCESS] phase_9b_legacy_identity_bridge.sql

✓ Successfully committed 1 migrations to staging database.
Total public tables now: 95
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
- **Exit Code**: 0 (Clean exit)
- **Transaction Outcome**: Atomically committed.

---

## 4. Before vs. After State Comparison

| Architectural Aspect | Pre-Migration Baseline (Phase 9A) | Post-Migration Verification (Phase 9B) | Difference |
| :--- | :--- | :--- | :--- |
| **Applied Migrations in `_migrations`** | 22 records | 23 records | +1 (`phase_9b_legacy_identity_bridge.sql`) |
| **Latest Migration Entry** | `phase_9a_rls_recursion_fix.sql` | `phase_9b_legacy_identity_bridge.sql` | Updated to Phase 9B |
| **Public Tables Count** | 94 tables | 95 tables | +1 (`public.legacy_user_id_map`) |
| **`public.legacy_user_id_map`** | Did not exist | Exists; 2 seeded rows (148, 151); RLS active | Created & Seeded |
| **`public.water_logs` Columns** | `id`, `user_id`, `intake_amount`, `intake_type`, `source`, `created_at` | Added `profile_id` (UUID), `amount_ml` (INT) | +2 compatibility columns |
| **`public.water_logs.user_id` Nullability** | `NOT NULL` | `NULLABLE` | Relaxed for V2 net-new users |
| **`public.water_logs` Total Row Count** | 13 rows | 13 rows | Identical (Zero deletion) |
| **`public.water_logs.amount_ml` NULL count** | N/A (column absent) | 0 NULL rows (100% backfilled) | Fully populated from `intake_amount` |
| **User 153 Rows in `water_logs`** | 12 rows (`user_id = 153`) | 12 rows (`user_id = 153`, `profile_id = NULL`) | Preserved unmapped |
| **User 147 Rows in `water_logs`** | 1 row (`user_id = 147`) | 1 row (`user_id = 147`, `profile_id = NULL`) | Preserved unmapped |
| **Compatibility Trigger** | None | `trg_sync_water_logs_compatibility` active | Installed (BEFORE INSERT/UPDATE) |
| **RLS on `water_logs`** | Legacy open / unrestrained | Dual-key authenticated & service-role policies | Hardened |
| **Sequence `water_logs_id_seq`** | `last_value = 13`, `is_called = true` | `last_value = 18`, `is_called = true` | Advances safely, zero PK collision |

---

## 5. Detailed Post-Execution Verification Evidence

### 5.1 Migration History Verification
Query:
```sql
SELECT name, run_at FROM public._migrations WHERE name = 'phase_9b_legacy_identity_bridge.sql';
```
Result:
```json
[
  {
    "name": "phase_9b_legacy_identity_bridge.sql",
    "run_at": "2026-10-11T17:07:36.445Z"
  }
]
```
- Total migrations in database: **23** (exactly 1 record added).

### 5.2 Seeded Identity Mappings
Query:
```sql
SELECT legacy_integer_id, profile_id, verification_method, created_at 
FROM public.legacy_user_id_map 
ORDER BY legacy_integer_id;
```
Result:
```json
[
  {
    "legacy_integer_id": 148,
    "profile_id": "b96c0b60-9a8b-496f-9e33-f533982412f6",
    "verification_method": "oauth_sub_and_email",
    "created_at": "2026-10-11T17:07:36.445Z"
  },
  {
    "legacy_integer_id": 151,
    "profile_id": "2dbbad1d-5988-4d6f-8c32-5c57080e56f5",
    "verification_method": "oauth_sub_and_email",
    "created_at": "2026-10-11T17:07:36.445Z"
  }
]
```
- Omitted candidate check (`legacy_integer_id IN (147, 149, 150, 152, 153)`): returned **0 rows**.
- Unique constraints & foreign keys confirmed: Primary key on `legacy_integer_id`, UNIQUE on `profile_id`.

### 5.3 Hydration Data Integrity & Baseline Audit
Query:
```sql
SELECT id, user_id, profile_id, intake_amount, amount_ml 
FROM public.water_logs 
ORDER BY id;
```
Result:
```
┌─────────┬────┬─────────┬────────────┬───────────────┬───────────┐
│ (index) │ id │ user_id │ profile_id │ intake_amount │ amount_ml │
├─────────┼────┼─────────┼────────────┼───────────────┼───────────┤
│ 0       │ 1  │ 153     │ null       │ 250           │ 250       │
│ 1       │ 2  │ 153     │ null       │ 350           │ 350       │
│ 2       │ 3  │ 153     │ null       │ 400           │ 400       │
│ 3       │ 4  │ 153     │ null       │ 1000          │ 1000      │
│ 4       │ 5  │ 153     │ null       │ 750           │ 750       │
│ 5       │ 6  │ 153     │ null       │ 500           │ 500       │
│ 6       │ 7  │ 153     │ null       │ 250           │ 250       │
│ 7       │ 8  │ 153     │ null       │ 1000          │ 1000      │
│ 8       │ 9  │ 153     │ null       │ 1000          │ 1000      │
│ 9       │ 10 │ 153     │ null       │ 1000          │ 1000      │
│ 10      │ 11 │ 153     │ null       │ 1000          │ 1000      │
│ 11      │ 12 │ 153     │ null       │ 1000          │ 1000      │
│ 12      │ 13 │ 147     │ null       │ 1000          │ 1000      │
└─────────┴────┴─────────┴────────────┴───────────────┴───────────┘
```
- **Total surviving historical rows**: Exactly 13.
- **NULL `amount_ml`**: Exactly 0.
- **User 153 unmapped rows**: Exactly 12.
- **User 147 unmapped rows**: Exactly 1.

### 5.4 Live Transactional Behavioral Testing
A series of behavioral writes was executed against staging within an atomic transaction that was verified and then rolled back cleanly to preserve baseline state:

1. **Mapped Modern Write (User 148)**:
   - Inserted: `profile_id = 'b96c0b60...'`, `amount_ml = 650`.
   - Result: Trigger translated `user_id := 148` and synchronized `intake_amount := 650`. (**PASS**)
2. **Mapped Modern Write (User 151)**:
   - Inserted: `profile_id = '2dbbad1d...'`, `amount_ml = 450`.
   - Result: Trigger translated `user_id := 151` and synchronized `intake_amount := 450`. (**PASS**)
3. **Unmapped Net-New Modern Write**:
   - Inserted: `profile_id = '2d27bc46...'` (unmapped UUID), `amount_ml = 900`.
   - Result: Trigger retained `user_id := NULL` and synchronized `intake_amount := 900`. (**PASS**)
4. **Legacy Client Write**:
   - Inserted: `user_id = 153`, `intake_amount = 350`.
   - Result: Trigger retained `profile_id := NULL` and synchronized `amount_ml := 350`. (**PASS**)
5. **Volume Boundary Validation**:
   - Inserted: `amount_ml = -50`.
   - Result: Trigger aborted with `Invalid hydration volume: volume must be strictly positive (> 0 ml)`. (**PASS**)
6. **Rollback & State Cleanliness**:
   - Verification transaction rolled back.
   - Final `water_logs` count confirmed at strictly 13 baseline rows.

### 5.5 Row Level Security & Policies
- `public.legacy_user_id_map`:
  - `rowsecurity`: `true`
  - Policy `"Users view own legacy mapping"`: `authenticated` (`auth.uid() = profile_id`)
  - Policy `"Service role manages legacy mapping"`: `service_role` (`ALL`)
  - Revocations: `PUBLIC` and `anon` explicitly revoked.
- `public.water_logs`:
  - `rowsecurity`: `true`
  - Policy `"Members manage own water logs"`: `authenticated` (`auth.uid() = profile_id OR mapped in legacy_user_id_map`)
  - Policy `"Service role manages water logs"`: `service_role` (`ALL`)
  - Sequence permissions: `USAGE, SELECT` granted to `authenticated` and `service_role`.

---

## 6. Failures, Deviations, or Incidents

- **Migration Errors**: None.
- **Assertion Failures**: None (all in-migration and post-migration assertions passed).
- **Transaction Rollbacks on Staging**: 0 unhandled aborts. (Only the controlled behavioral test transaction was rolled back as designed).
- **Deviations from Authorization**: 0. Only Phase 9B was executed.

---

## 7. Operational Boundaries & Final Status

### Final Status: **`PHASE 9B DEPLOYED AND VERIFIED ON STAGING`**

```
====================================================================
DEPLOYMENT SUMMARY:
- Target Project:      ymrblyiwohvxptiqjfsi (Staging)
- Migration:           phase_9b_legacy_identity_bridge.sql
- Bridge Table:        public.legacy_user_id_map (2 rows: 148, 151)
- Historical Rows:     13 / 13 intact (User 153: 12, User 147: 1)
- Backfill:            100% complete (amount_ml = intake_amount)
- RLS & Triggers:      Active, verified, and hardened
- DB-4 Status:         NOT STARTED (Awaiting separate authorization)
- Production Status:   UNTOUCHED
====================================================================
```

### Strict Execution Halt Enforced
- All background tasks and processes are stopped.
- Staging migration is complete and fully verified.
- DB-4 has **not** started.
- Standing by for further instructions from operator.
