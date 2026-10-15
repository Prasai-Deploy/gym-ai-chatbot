# STRIVA V2 — DB-3: Legacy-to-UUID Identity Mapping Audit

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-11  
**Target Environment:** `ymrblyiwohvxptiqjfsi` (STRIVA V2 Staging)  
**Connecting Role:** `postgres`  
**Status:** **AUDIT COMPLETE (READ-ONLY) — ZERO DDL/DML EXECUTED**  

---

## Executive Summary

This audit investigates the identity architecture split in the STRIVA database between:
1. **Legacy V1 Architecture**: Serial integer primary keys (`public.users.id INT`), with 31 relational tables referencing integer user IDs.
2. **Modern STRIVA V2 Architecture**: Cryptographic UUID primary keys (`auth.users.id UUID` & `public.profiles.id UUID`), with 24 domain tables referencing UUID user IDs.

All findings in this report were gathered exclusively through **read-only SQL catalog introspection and metadata analysis**. No table schemas were altered, no foreign keys were added or modified, no rows were updated, and no personal data or secrets are exposed.

### Key Audit Findings
1. **The Identity Split**: Exactly **7 legacy users** exist in `public.users` (integer IDs 147–153), while **5 modern profiles** exist in `public.profiles` (UUIDs matching `auth.users`).
2. **Deterministic Email & Google Sub Mapping**:
   - **3 legacy users** (42.9%) have an exact case-insensitive email match in `public.profiles`.
   - For 2 of these 3 users (IDs 148 and 151), the identity mapping is **independently corroborated** by an exact match between `public.users.google_id` and `auth.users.raw_user_meta_data->>'sub'`.
   - **Zero email collisions or duplicate identities** exist in either table.
3. **The Unmapped Legacy Population**:
   - **4 legacy users** (IDs 149, 150, 152, 153) have **no profile** in `public.profiles` and **no account** in `auth.users`.
4. **Historical Activity Data Distribution**:
   - Across all 31 legacy tables, exactly **5 tables contain live data**; the remaining 26 tables are completely empty (0 rows).
   - In `public.water_logs` (13 live records), **12 records belong to unmapped legacy User 153**, and **1 record belongs to mapped legacy User 147**. Zero orphan rows exist.
   - Any naive migration that enforces `NOT NULL profile_id` or deletes unmapped records would **permanently destroy 92.3% of historical hydration data**.
5. **Runtime Errors in V2 Repositories**:
   - `NutritionRepository.ts` attempts to query `water_logs` using Supabase Auth UUID strings against an integer column, causing PostgreSQL error `22P02: invalid input syntax for type integer`.
   - `NutritionRepository.ts` queries `v2_nutrition_logs`, which does not exist in the database (causing `PGRST205`).
   - `V2WorkoutSessionRepository.ts` queries `v2_workout_sessions`, which does not exist in the database.
   - `WorkoutPlanRepository.ts` queries `workout_plans` expecting string UUIDs, but the live table has integer primary and foreign keys.

---

## 1. Verified Table Relationships & Column Types

### 1.1 Identity Anchor Tables

| Table Name | Primary Key | User Identifier Column | Foreign Key Reference | Live Row Count |
| :--- | :---: | :---: | :--- | :---: |
| `public.users` | `id` (`integer`) | `id` (`integer`) | Standalone legacy user table | **7** |
| `auth.users` | `id` (`uuid`) | `id` (`uuid`) | Supabase Auth internal engine | **5** |
| `public.profiles` | `id` (`uuid`) | `id` (`uuid`) | `FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE` | **5** |
| `public.v2_fitness_profiles` | `id` (`uuid`) | `id` (`uuid`) | `FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE` | **4** |

> [!NOTE]
> `public.v2_fitness_profiles` does **not** contain a separate `user_id` column. Its primary key `id` is a 1:1 foreign key referencing `public.profiles(id)`. All 4 live rows in `v2_fitness_profiles` point to valid records in `public.profiles`.

### 1.2 Legacy Activity & Domain Tables with User Identifiers

The catalog inspection identified **31 legacy tables** storing `user_id` as an `integer`. Live row counts were verified across all 31 tables:

| Category | Table Name | Identity Column Type | FK Target in Schema | Live Row Count | Data Status |
| :--- | :--- | :---: | :--- | :---: | :---: |
| **Hydration** | `public.water_logs` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | **13** | **Active Historical Data** |
| | `public.daily_hydration_progress` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | **2** | **Active Historical Data** |
| | `public.water_goals` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| **Fitness / Progress**| `public.daily_fitness_stats` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | **1** | **Active Historical Data** |
| | `public.weekly_progress` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | **1** | **Active Historical Data** |
| | `public.fitness_profiles` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.progress` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.progress_logs` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.user_progress` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.user_stats` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.user_streaks` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.activity_logs` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.activity_tracking_state`| `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| **Nutrition** | `public.nutrition_logs` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.meal_plans` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.user_diet_assignments` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.user_meal_tracking` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.chatbot_generated_diets`| `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| **Workout** | `public.workout_sessions` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.workout_logs` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.workout_plans` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.user_workout_assignments`| `user_id` (`integer`)| `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.user_fitness_plans` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.chatbot_generated_plans`| `user_id` (`integer`)| `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.chatbot_generated_workouts`| `user_id` (`integer`)| `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.daily_plans` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| **Membership / Admin**| `public.memberships` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | **1** | **Active Historical Data** |
| | `public.ai_chat_logs` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.push_subscriptions` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.user_badges` | `user_id` (`integer`) | `users(id) ON DELETE CASCADE` | 0 | Empty |
| | `public.user_notification_settings`| `user_id` (`integer`)| `users(id) ON DELETE CASCADE`| 0 | Empty |

### 1.3 Modern V2 Tables with UUID User Identifiers

The catalog inspection confirmed that **24 modern STRIVA V2 tables** exclusively use `UUID` user identifiers:
- `organization_members.user_id` (`UUID`)
- `organization_staff.user_id` (`UUID`)
- `organizations.owner_id` (`UUID`)
- `attendance_logs.user_id` (`UUID`)
- `trainer_member_assignments.member_user_id` & `trainer_user_id` (`UUID`)
- `subscriptions.user_id` (`UUID`)
- `invoices.user_id` (`UUID`)
- `ai_conversations.user_id` (`UUID`)
- `ai_agent_memories.user_id` (`UUID`)
- `ai_usage_analytics.user_id` (`UUID`)
- `organization_notifications.recipient_user_id` (`UUID`)
- `organization_notification_reads.user_id` (`UUID`)
- `user_goals.user_id` (`UUID`)
- `user_milestones.user_id` (`UUID`)
- `user_achievements.user_id` (`UUID`)
- *(and 9 other V2 audit, analytics, and recommendation tables)*

---

## 2. Mapping Coverage, Overlap & Orphan Analysis

### 2.1 Identity Inventory & Overlap Matrix

```mermaid
graph LR
    subgraph Legacy [Legacy Domain: public.users (7)]
        L1[Legacy 147]
        L2[Legacy 148]
        L3[Legacy 151]
        L4[Legacy 149 - Unmapped Admin]
        L5[Legacy 150 - Unmapped]
        L6[Legacy 152 - Unmapped]
        L7[Legacy 153 - Unmapped 12 water logs]
    end

    subgraph Modern [Modern Domain: public.profiles (5)]
        P1[Profile a1bf8b11...]
        P2[Profile b96c0b60...]
        P3[Profile 2dbbad1d...]
        P4[Profile 2d27bc46... Net-new]
        P5[Profile e17245f8... Net-new]
    end

    L1 -->|Email match| P1
    L2 -->|Email + Google sub match| P2
    L3 -->|Email + Google sub match| P3
```

### 2.2 Verified Deterministic Mappings (3 Users)

A cross-table inspection comparing case-insensitive email (`LOWER(users.email) = LOWER(profiles.email)`) and Google OAuth provider IDs (`users.google_id = auth.users.raw_user_meta_data->>'sub'`) established exactly **3 unambiguous mappings**:

| Legacy User ID | Masked Email | Verified Profile UUID Prefix | Verification Basis | Historical Records Linked |
| :---: | :---: | :---: | :--- | :---: |
| **147** | `d***o@s***.com` | `a1bf8b11...` | Exact Case-Insensitive Email Match | 1 `water_log`, 1 `daily_hydration` |
| **148** | `s***5@g***.com` | `b96c0b60...` | **Dual Verified**: Email + Google Sub (`101315497550140981399`) | 0 activity logs |
| **151** | `p***8@g***.com` | `2dbbad1d...` | **Dual Verified**: Email + Google Sub (`104636286967743040898`) | 1 `membership` |

### 2.3 Unmapped Legacy Users (4 Users)

The following legacy users exist in `public.users` but have **no profile** in `public.profiles` and **no user record** in `auth.users`:

| Legacy User ID | Masked Email | Role / Attributes | Historical Records in DB | Status / Impact |
| :---: | :---: | :--- | :--- | :--- |
| **149** | `a***n@s***.com` | `is_admin = true` | 0 records | Unmapped legacy admin |
| **150** | `m***4@g***.com` | Standard user (Google ID present) | 0 records | Unmapped legacy user |
| **152** | `p***1@g***.com` | Standard user (Google ID present) | 0 records | Unmapped legacy user |
| **153** | `k***3@g***.com` | Standard user (Google ID present) | **12 `water_logs`**, **1 `daily_hydration`**, **1 `daily_fitness`**, **1 `weekly_progress`** | **CRITICAL DATA OWNER**: Holds 92.3% of all hydration data in the system |

### 2.4 Unmapped Modern Profiles (2 Profiles)

The following profiles exist in `public.profiles` (and `auth.users`) but have **no predecessor** in `public.users`:
- `Profile 2d27bc46...` (`q***r@s***.com`): Net-new STRIVA V2 user created on 2026-07-25.
- `Profile e17245f8...` (`g***2@g***.com`): Net-new STRIVA V2 user created on 2026-07-25.

### 2.5 Duplicate & Collision Analysis
- **Email Uniqueness in `public.users`**: Exactly 7 distinct emails for 7 rows. Zero duplicates.
- **Email Uniqueness in `public.profiles`**: Exactly 5 distinct emails for 5 rows. Zero duplicates.
- **Collision Check**: Zero instances where a single legacy email matches multiple profiles, or a single profile email matches multiple legacy users.
- **Orphan Check on Legacy FKs**: Zero orphaned rows in `water_logs`, `daily_hydration_progress`, `daily_fitness_stats`, `weekly_progress`, or `memberships`. Every single record references a valid primary key in `public.users`.

---

## 3. Repositories & Application Queries Audited

| Repository / Service File | Target Relation in Code | Code Column Expectation | Live Database Relation | Live Column Type | Runtime Consequence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [`NutritionRepository.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/src/modules/nutrition/repositories/NutritionRepository.ts#L128-L167) | `public.water_logs` | `user_id: string (UUID)`, `amount_ml: number` | `public.water_logs` | `user_id: integer`, `intake_amount: integer` | **PostgreSQL Error 22P02** (`invalid input syntax for type integer: "uuid"`). Query fails; insert fails. |
| [`NutritionRepository.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/src/modules/nutrition/repositories/NutritionRepository.ts#L8-L100) | `public.v2_nutrition_logs` | `id: UUID`, `user_id: UUID`, `date`, `meal_type`, `calories` | **Does not exist** | Table missing | **Supabase Error PGRST205** (`Could not find the table 'public.v2_nutrition_logs' in the schema cache`). |
| [`V2WorkoutSessionRepository.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/src/modules/workout/repositories/V2WorkoutSessionRepository.ts#L21-L93) | `public.v2_workout_sessions` | `id: UUID`, `user_id: UUID`, `plan_id: UUID`, `state` | **Does not exist** (Only legacy `workout_sessions` exists: 0 rows, integer PK) | Table missing | **Supabase Error PGRST205** on active workout session queries. |
| [`WorkoutPlanRepository.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/src/modules/workout/repositories/WorkoutPlanRepository.ts#L18-L56) | `public.workout_plans` | `id: string (UUID)`, `user_id: string (UUID)`, `title` | `public.workout_plans` | `id: integer`, `user_id: integer`, `focus: varchar`, `exercises: jsonb` | Type casting failure when querying by UUID string; schema mismatch on columns. |
| [`organization.repository.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/src/modules/organization/organization.repository.ts) | `public.profiles` | `id: UUID`, `organization_id: UUID` | `public.profiles` | `id: UUID`, `organization_id: UUID` | **Clean Match** (V2 canonical architecture). |
| [`trainer.repository.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/src/modules/trainer/trainer.repository.ts) | `public.profiles` | `id: UUID` | `public.profiles` | `id: UUID` | **Clean Match** (V2 canonical architecture). |
| [`attendance.repository.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/src/modules/attendance/attendance.repository.ts) | `public.profiles` | `id: UUID` | `public.profiles` | `id: UUID` | **Clean Match** (V2 canonical architecture). |
| `legacy/routes/admin.routes.ts` | `public.users`, `public.memberships` | `id: integer`, `user_id: integer` | `public.users`, `public.memberships` | `id: integer`, `user_id: integer` | Functional only for legacy integer users; completely detached from V2 auth context. |

---

## 4. Risks & Safe Mapping Options

### 4.1 Identified Migration Risks

1. **Risk of Silent Data Destruction (Critical)**:
   - If `water_logs.user_id` is altered in-place to `UUID` with `NOT NULL` or with an inner join against `profiles`, the 12 records belonging to User 153 will be dropped or set to invalid keys.
2. **Type Coercion Failure (`22P02`)**:
   - Supabase PostgREST client passes string UUIDs. Comparing string UUIDs to PostgreSQL `int4` columns causes query failure (`22P02`) in PostgreSQL 17+.
3. **Ambiguity Risk from Guessing Unmapped Accounts**:
   - The 4 unmapped legacy users cannot have UUIDs synthetically generated or guessed without violating STRIVA V2 security invariants. If a UUID is guessed without a backing `auth.users` identity, the user will never be able to authenticate and claim their data.

### 4.2 Architectural Mapping Options

#### Option A: In-Place Schema Alteration (`ALTER TABLE ... ALTER COLUMN user_id TYPE uuid`)
- **Mechanism**: Coerce existing `user_id` columns to `UUID` and drop legacy `public.users`.
- **Verdict**: **REJECTED (UNSAFE)**.
  - Causes irreversible data loss for User 153 (12 water logs).
  - Breaks foreign keys across all 31 legacy tables.
  - Violates safety rules prohibiting destructive DDL.

#### Option B: Dedicated Bridge Mapping Table with Dual-Key Transitional Columns (RECOMMENDED)
- **Mechanism**:
  1. Create a versioned canonical mapping table `public.legacy_user_id_map`:
     ```sql
     CREATE TABLE public.legacy_user_id_map (
         legacy_integer_id INT PRIMARY KEY REFERENCES public.users(id),
         profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
         email TEXT NOT NULL UNIQUE,
         verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     );
     ```
  2. Populate verified mappings for legacy IDs 147, 148, and 151.
  3. Add an additive column `profile_id UUID REFERENCES public.profiles(id)` to `public.water_logs` alongside `user_id INT`, preserving existing data.
  4. Backfill `profile_id` for mapped records. Leave `profile_id NULL` for User 153 until User 153 authenticates via Supabase Auth.
  5. Add an additive alias column `amount_ml INT` to `water_logs` with a bidirectional sync trigger to resolve the column naming discrepancy between frontend/backend and PostgreSQL.
- **Verdict**: **APPROVED FOR IMPLEMENTATION PLANNING**.
  - 100% additive; zero data loss.
  - Preserves historical water logs for both mapped and unmapped users.
  - Resolves `22P02` errors by allowing V2 code to query by `profile_id UUID`.

---

## 5. Proposed Migration & Backfill Plan (DB-3 Implementation Strategy)

### Step 1: Preflight Verification Gate
- Confirm exact counts: `users = 7`, `profiles = 5`, `water_logs = 13`.
- Confirm 0 conflicting advisory locks.

### Step 2: Create Canonical Identity Bridge Table
- Create `public.legacy_user_id_map` with Row Level Security.
- Insert verified mappings for Legacy IDs 147, 148, 151 based on matching case-insensitive emails.

### Step 3: Additive Hydration Schema Dual-Key Adaptation
- Add `profile_id UUID` (nullable) to `public.water_logs`.
- Add `amount_ml INT` (nullable) to `public.water_logs`.
- Backfill `amount_ml = intake_amount` for all 13 rows.
- Backfill `profile_id = m.profile_id` for rows where `user_id = m.legacy_integer_id` (updates 1 row for User 147; leaves 12 rows for User 153 intact with `user_id = 153, profile_id = NULL`).
- Install a bidirectional trigger `sync_water_logs_compatibility()` to mirror inserts/updates between `amount_ml` and `intake_amount`.

### Step 4: Transitional RLS Policy on `water_logs`
- Enable RLS on `water_logs` with a dual-key policy:
  ```sql
  CREATE POLICY "Members manage own water logs" ON public.water_logs
      FOR ALL TO authenticated, service_role
      USING (
          auth.uid() = profile_id OR
          EXISTS (
              SELECT 1 FROM public.legacy_user_id_map m
              WHERE m.legacy_integer_id = water_logs.user_id 
                AND m.profile_id = auth.uid()
          )
      )
      WITH CHECK (
          auth.uid() = profile_id
      );
  ```

### Step 5: Deferred Claiming Hook for Legacy User 153
- When User 153 (`k***3@g***.com`) signs in via Supabase Auth in the future, a post-authentication trigger or service will:
  1. Detect the email match in `public.users`.
  2. Insert the bridge record into `public.legacy_user_id_map(153, new_profile_id, email)`.
  3. Update `water_logs SET profile_id = new_profile_id WHERE user_id = 153`.
  - Result: All 12 historical water logs are instantly claimed without manual intervention.

### Step 6: Canonical V2 Schema Creation for Nutrition & Workout
- Since `public.v2_nutrition_logs` and `public.v2_workout_sessions` do not exist in the database, deploy versioned additive migrations:
  - `phase_9d_canonical_nutrition.sql` (Creates `v2_nutrition_logs` with `user_id UUID`).
  - `phase_9e_v2_workout_sessions.sql` (Creates `v2_workout_sessions` with `user_id UUID`).

---

## 6. Clear Separation: Verified Findings vs. Assumptions

### Verified Findings (Empirically Proven by Database & Code Introspection)
1. `public.users` contains exactly 7 records with integer IDs 147–153.
2. `public.profiles` contains exactly 5 records with UUID primary keys.
3. `auth.users` contains exactly 5 records with matching UUID primary keys.
4. Exactly 3 emails match between `public.users` and `public.profiles` (IDs 147, 148, 151).
5. For IDs 148 and 151, `google_id` matches `auth.users.raw_user_meta_data->>'sub'` identically.
6. Legacy IDs 149, 150, 152, 153 have no corresponding records in `auth.users` or `public.profiles`.
7. `public.water_logs` contains exactly 13 records with integer `user_id` values pointing to IDs 147 (1 row) and 153 (12 rows).
8. `public.v2_fitness_profiles` uses `id UUID` referencing `profiles(id)` directly; all 4 rows match existing profiles.
9. `public.v2_nutrition_logs` and `public.v2_workout_sessions` do not exist in PostgreSQL, causing `PGRST205` errors.
10. `water_logs.intake_amount` exists, while `amount_ml` does not, causing query/insertion failures in `NutritionRepository.ts`.

### Assumptions (Architectural Inferences Subject to Operator Policy)
1. *Assumption*: The historical 12 water logs belonging to User 153 must be preserved indefinitely until User 153 registers in Supabase Auth. *(If the business deems these logs disposable test telemetry, the migration complexity could be reduced; however, data preservation rules require treating them as critical historical user data).*
2. *Assumption*: Case-insensitive email equivalence is an authorized criterion for linking Legacy User 147 to Profile `a1bf8b11...` in the absence of a Google sub ID.
3. *Assumption*: The 26 empty legacy integer tables (0 rows) can eventually be deprecated safely without backfilling.
4. *Assumption*: The modern V2 repositories (`NutritionRepository`, `V2WorkoutSessionRepository`) represent the canonical target contract, and the database schema should adapt forward to them rather than regressing the codebase to legacy schemas.

---

## 7. Audit Conclusion & Stop Notice

- **Audit Status**: **COMPLETE**
- **Remote DDL/DML Executed**: **ZERO**
- **Safety Boundary Enforced**: All data in `public.users`, `public.water_logs`, and `public.profiles` remains completely unmodified.
- **Hard Stop**: In strict accordance with the task instructions, no migration or backfill has been applied. Awaiting operator review and authorization of the proposed DB-3 implementation plan.
