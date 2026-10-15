# STRIVA V2 — DATABASE RECONCILIATION SPECIFICATION

## 1. DATABASE ARCHITECTURE OVERVIEW

STRIVA V2 targets a unified PostgreSQL database managed exclusively via versioned SQL migrations in `backend/supabase/migrations/`.

### Architectural Principles
- **Multi-Tenant Foundation**: All organization-level assets are scoped by `organization_id (UUID)`.
- **Identity Foundation**: All user-level assets reference Supabase `auth.users(id) UUID`.
- **Zero Raw Direct UI Access**: RLS policies enforce security at the database layer; backend services mediate application workflows.

---

## 2. MIGRATION INVENTORY & CLASSIFICATION

| Migration File / Source | Location | Scope / Purpose | Classification |
| :--- | :--- | :--- | :--- |
| `001_identity_domain.sql` | `backend/supabase/migrations/` | Base user profiles | **CANONICAL** |
| `002_exercise_library.sql` | `backend/supabase/migrations/` | Exercises & muscle catalog | **CANONICAL** |
| `003_workout_engine.sql` | `backend/supabase/migrations/` | Workout plans & sessions | **CANONICAL** |
| `004_progress_analytics.sql` | `backend/supabase/migrations/` | Snapshots & statistics | **CANONICAL** |
| `005_intelligence_domain.sql` | `backend/supabase/migrations/` | AI memory & recommendations | **CANONICAL** |
| `006_ai_runtime.sql` | `backend/supabase/migrations/` | AI chat & tool executions | **CANONICAL** |
| `008_multi_tenant_saas_foundation.sql` | `backend/supabase/migrations/` | Organizations & RBAC staff | **CANONICAL** |
| `009_ai_memory_and_usage.sql` | `backend/supabase/migrations/` | Usage analytics | **CANONICAL** |
| `010_analytics_and_attendance.sql` | `backend/supabase/migrations/` | Attendance check-ins | **CANONICAL** |
| `011_phase3_tenant_rls_consolidation.sql` | `backend/supabase/migrations/` | Multi-tenant RLS & helper functions | **CANONICAL (PHASE 3)** |
| `schema.sql` / `schema-postgres.sql` | Root directory | V1 raw table dumps | **LEGACY / OBSOLETE** |
| `v2_additive_migration.sql` | Root directory | Manual additive script dump | **DUPLICATE** |
| `legacy/migrations/002_...008` | `legacy/migrations/` | V1 Integer-PK migrations | **LEGACY** |

---

## 3. MASTER TABLE INVENTORY & DECISION MATRIX

| Table Name | Category | PK Type | Tenant Scoped? | Canonical Decision | RLS Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `profiles` | Identity | `UUID` | Optional | **RETAIN** (Canonical Profile) | Enabled |
| `v2_fitness_profiles` | Identity | `UUID` | No | **RETAIN** (Fitness Metadata) | Enabled |
| `users` (V1) | Identity | `INT` | No | **DEPRECATE** (Map to `profiles`) | Disabled |
| `fitness_profiles` (V1)| Identity | `INT` | No | **DEPRECATE** (Map to `v2_fitness_profiles`)| Disabled |
| `legacy_user_id_map` | Identity | `INT` | No | **RETAIN** (ID Bridge Map) | Enabled |
| `organizations` | Tenant | `UUID` | Self | **RETAIN** (Root Org Tenant) | Enabled |
| `organization_members`| Tenant | `UUID` | Yes | **RETAIN** (Org RBAC Membership) | Enabled |
| `organization_locations`| Tenant | `UUID` | Yes | **RETAIN** (Gym Branches) | Enabled |
| `exercises` | Reference | `UUID` | Global | **RETAIN** (Master Catalog) | Enabled |
| `workout_plans` | Workout | `UUID` | Yes | **RETAIN** (Routines) | Enabled |
| `v2_workout_sessions` | Workout | `UUID` | No | **RETAIN** (Canonical Sessions) | Enabled |
| `workout_sessions` (V1) | Workout | `INT/UUID` | No | **DEPRECATE** (Map to `v2_workout_sessions`)| Disabled |
| `exercise_sets` | Workout | `UUID` | No | **RETAIN** (Set Logs) | Enabled |
| `v2_nutrition_logs` | Nutrition | `UUID` | Optional | **RETAIN** (Daily Macros & Meals)| Enabled |
| `nutrition_logs` (V1) | Nutrition | `INT` | No | **DEPRECATE** (Map to `v2_nutrition_logs`)| Disabled |
| `water_logs` | Nutrition | `UUID` | No | **RETAIN** (Hydration) | Enabled |
| `progress_snapshots` | Progress | `UUID` | No | **RETAIN** (Body Measurements)| Enabled |
| `ai_conversations` | TRINETRA | `UUID` | Optional | **RETAIN** (Chat Threads) | Enabled |
| `ai_messages` | TRINETRA | `UUID` | No | **RETAIN** (Chat Timeline) | Enabled |
| `ai_memory` | TRINETRA | `UUID` | No | **RETAIN** (Long-term Facts) | Enabled |
| `subscriptions` | Billing | `UUID` | Optional | **RETAIN** (Razorpay Subscriptions)| Enabled |
| `attendance_logs` | Attendance| `UUID` | Yes | **RETAIN** (Turnstile Check-ins)| Enabled |

---

## 4. DUPLICATE TABLE CONSOLIDATION & RECONCILIATION

### 4.1 Identity Domain Reconciliation
- **Conflict**: Legacy V1 schemas rely on `users.id (INTEGER)` and `fitness_profiles.user_id (INTEGER)`. V2 requires Supabase Auth `profiles.id (UUID)`.
- **Reconciliation Bridge Strategy**: Migration `011_phase3_tenant_rls_consolidation.sql` introduces `public.legacy_user_id_map (legacy_integer_id INT, supabase_uuid UUID)`.
- **Preservation Rule**: Legacy tables `users` and `fitness_profiles` are retained intact. New writes target `profiles` and `v2_fitness_profiles`.

### 4.2 Workout Session Reconciliation
- **Conflict**: `workout_sessions` (V1) vs `v2_workout_sessions` (V2).
- **Decision**: `v2_workout_sessions` is established as the canonical execution table. `workout_sessions` is preserved for historical read queries.

---

## 5. ROW LEVEL SECURITY (RLS) & HELPER FUNCTIONS

### 5.1 Helper Functions
1. `public.get_auth_user_id()`: Returns `auth.uid()`.
2. `public.is_org_member(target_org_id UUID)`: Queries `organization_members` or `organizations.owner_id` to verify if the authenticated user is an active member or owner of `target_org_id`.

### 5.2 RLS Isolation Matrix
- **Tenant Data (`organizations`, `attendance_logs`, `workout_plans`)**: Restricted to authenticated users whose `auth.uid()` matches an active membership in the target `organization_id`.
- **Member Data (`v2_workout_sessions`, `v2_nutrition_logs`, `water_logs`, `ai_memory`)**: Restricted strictly to `auth.uid() = user_id`.
- **Reference Data (`exercises`, `achievements`)**: Authenticated read-only access (`auth.role() = 'authenticated'`).
