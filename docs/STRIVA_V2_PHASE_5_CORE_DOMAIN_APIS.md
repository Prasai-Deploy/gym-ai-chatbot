# STRIVA V2 — PHASE 5: CORE DOMAIN APIs & MEMBER DATA LAYER DOCUMENTATION

## 1. PHASE OBJECTIVE
Phase 5 establishes the canonical REST API layer (`/api/v1`) for STRIVA V2 as the sole source of truth for member and gym data across Identity, Organization, Exercise, Workout, Nutrition, Hydration, Progress, and Attendance domains.

All endpoints enforce:
- Verified Supabase Auth JWT authentication (`requireAuth`)
- Database-backed multi-tenant isolation (`tenantMiddleware`)
- Server-side Role-Based Access Control (`requireRoles`)
- Strict member resource privacy (`auth.uid() = user_id`)
- Zero fallback JSON, zero client-supplied identity claims, zero hardcoded fallback org UUIDs

---

## 2. ARCHITECTURE IMPLEMENTED

```
React App
  ↓
src/api (httpClient.ts with Bearer JWT)
  ↓
/api/v1 Domain Routers
  ↓
Authentication Middleware (requireAuth)
  ↓
Tenant Resolution Middleware (tenantMiddleware via DB membership lookup)
  ↓
RBAC / Authorization Middleware (requireRoles)
  ↓
Domain Controller (Thin Express Controller with Zod schema validation)
  ↓
Domain Service (Encapsulated business logic)
  ↓
Repository Layer (Supabase PostgREST client targeting canonical PostgreSQL schema)
  ↓
PostgreSQL / Supabase RLS Policies
```

---

## 3. DOMAIN IMPLEMENTATIONS

### 5A — Identity & Organization APIs
- **Identity**:
  - Profile: `GET /api/v1/identity/profile`, `PATCH /api/v1/identity/profile`
  - Fitness Profile: `GET /api/v1/identity/profile/fitness`, `PATCH /api/v1/identity/profile/fitness`
  - Preferences: `GET /api/v1/identity/profile/preferences`, `PATCH /api/v1/identity/profile/preferences`
  - Member Settings: `GET /api/v1/identity/profile/settings`, `PATCH /api/v1/identity/profile/settings`
  - Composite User Profile: `GET /api/v1/identity/me`
  - Demo Reset: `POST /api/v1/identity/demo/reset` (isolated to demo user `demo@sweatfix.com`)
- **Organization**:
  - Current Context: `GET /api/v1/organizations/current`
  - User Organizations: `GET /api/v1/organizations`
  - Organization Details: `GET /api/v1/organizations/:id`
  - Locations: `GET /api/v1/organizations/:id/locations`
  - Members Roster: `GET /api/v1/organizations/:id/members`
  - Branding: `GET /api/v1/organizations/branding`

### 5B — Exercise & Workout APIs
- **Exercise Library**:
  - `GET /api/v1/exercises`
  - `GET /api/v1/exercises/search`
  - `GET /api/v1/exercises/categories`
  - `GET /api/v1/exercises/muscles`
  - `GET /api/v1/exercises/equipment`
  - `GET /api/v1/exercises/:id`
- **Workout Planning vs Execution**:
  - **Planning (`workout_plans`)**:
    - `GET /api/v1/workouts/plans`
    - `GET /api/v1/workouts/plans/:id`
    - `POST /api/v1/workouts/plans`
    - `PATCH /api/v1/workouts/plans/:id`
  - **Execution (`v2_workout_sessions`, `exercise_sets`)**:
    - `GET /api/v1/workouts/today`
    - `POST /api/v1/workouts/sessions/start`
    - `GET /api/v1/workouts/sessions/active`
    - `GET /api/v1/workouts/sessions/:id`
    - `POST /api/v1/workouts/sessions/:id/transition`
    - `POST /api/v1/workouts/sessions/:id/complete`
    - `POST /api/v1/workouts/sets`
    - `PATCH /api/v1/workouts/sets/:setId`
    - `GET /api/v1/workouts/history`

### 5C — Nutrition & Hydration APIs
- **Nutrition (`v2_nutrition_logs`)**:
  - `GET /api/v1/nutrition/daily`
  - `POST /api/v1/nutrition/meals`
  - `PATCH /api/v1/nutrition/meals/:id`
  - `DELETE /api/v1/nutrition/meals/:id`
- **Hydration (`water_logs`)**:
  - `GET /api/v1/nutrition/water`
  - `POST /api/v1/nutrition/water`
  - `DELETE /api/v1/nutrition/water/:id`

### 5D — Progress & Attendance APIs
- **Progress (`progress_statistics`, `progress_snapshots`, `user_achievements`)**:
  - `GET /api/v1/progress/statistics`
  - `GET /api/v1/progress/summary`
  - `GET /api/v1/progress/snapshots`
  - `GET /api/v1/progress/history`
  - `GET /api/v1/progress/achievements`
- **Attendance (`attendance_logs`)**:
  - `GET /api/v1/analytics/attendance`
  - `GET /api/v1/analytics/attendance/history`
  - `POST /api/v1/analytics/attendance/checkin`
  - `POST /api/v1/analytics/attendance/checkout`

---

## 4. ENDPOINT INVENTORY & AUTHORIZATION MATRIX

| Route Path | Method | Auth | Tenant Context | Authorization Level | Domain Service & Table |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/v1/identity/profile` | GET / PATCH | JWT | Optional | Authenticated Owner (`auth.uid() = id`) | `IdentityService` → `profiles` |
| `/api/v1/identity/profile/fitness` | GET / PATCH | JWT | Optional | Authenticated Owner | `IdentityService` → `v2_fitness_profiles` |
| `/api/v1/identity/profile/preferences` | GET / PATCH | JWT | Optional | Authenticated Owner | `IdentityService` → `user_preferences` |
| `/api/v1/identity/profile/settings` | GET / PATCH | JWT | Optional | Authenticated Owner | `IdentityService` → `member_settings` |
| `/api/v1/identity/me` | GET | JWT | Optional | Authenticated Owner | `IdentityService` composite |
| `/api/v1/identity/demo/reset` | POST | JWT | Optional | Demo Account Only (`demo@sweatfix.com`) | `IdentityService` demo reset |
| `/api/v1/organizations` | GET | JWT | Resolved | Member / Owner of Orgs | `OrganizationService` → `organization_members` |
| `/api/v1/organizations/current` | GET | JWT | Enforced | Active Org Member | `OrganizationService` → `organizations` |
| `/api/v1/organizations/:id` | GET | JWT | Resolved | Org Member / Owner Check | `OrganizationService` → `organizations` |
| `/api/v1/organizations/:id/locations` | GET | JWT | Resolved | Org Member Check | `OrganizationService` → `organization_locations` |
| `/api/v1/organizations/:id/members` | GET | JWT | Resolved | Org Staff / Owner Check | `OrganizationService` → `organization_members` |
| `/api/v1/exercises` | GET | JWT | Optional | Authenticated Users | `ExerciseService` → `exercises` |
| `/api/v1/workouts/plans` | GET / POST | JWT | Optional | Authenticated Member | `WorkoutExecutionService` → `workout_plans` |
| `/api/v1/workouts/sessions/start` | POST | JWT | Optional | Authenticated Member | `WorkoutExecutionService` → `v2_workout_sessions` |
| `/api/v1/workouts/sessions/:id` | GET | JWT | Optional | Session Owner (`auth.uid() = user_id`) | `WorkoutExecutionService` → `v2_workout_sessions` |
| `/api/v1/nutrition/daily` | GET | JWT | Optional | Authenticated Member | `NutritionService` → `v2_nutrition_logs` |
| `/api/v1/nutrition/meals` | POST | JWT | Optional | Authenticated Member | `NutritionService` → `v2_nutrition_logs` |
| `/api/v1/nutrition/water` | GET / POST | JWT | Optional | Authenticated Member | `NutritionService` → `water_logs` |
| `/api/v1/progress/statistics` | GET | JWT | Optional | Authenticated Member | `ProgressAnalyticsService` → `progress_statistics` |
| `/api/v1/analytics/attendance/history` | GET | JWT | Enforced | Authenticated Member | Supabase → `attendance_logs` |

---

## 5. TEST & BUILD RESULTS

- **Backend Security Tests**: 9 test suites, **96 passed / 96 total** (100% passing).
  - `phase5_domain_apis.security.test.ts`: 19 passed.
  - `phase4_tenant_auth.security.test.ts`: 9 passed.
  - `analytics.security.test.ts`: 13 passed.
  - `razorpay.security.test.ts`: 16 passed.
  - `ai_memory.security.test.ts`: 10 passed.
  - `ai_provider.security.test.ts`: 6 passed.
  - `ai_usage.security.test.ts`: 6 passed.
  - `admin_auth.security.test.ts`: 11 passed.
  - `rls.security.test.ts`: 6 passed.
- **Backend Build (`npm run build:backend`)**: Exit code 0 (Clean TypeScript compilation).
- **Frontend Build (`npm run build:frontend`)**: Exit code 0 (Clean Vite bundle output).

---

## 6. DATABASE INTEGRATION STATUS

- **Static Validation**: PASS — All SQL schemas, foreign keys, and RLS policies verified.
- **Application Test Validation**: PASS — All 96 unit and security integration mock tests pass cleanly.
- **Local Database Validation**: PASS — Verified against PostgreSQL schema definitions.
- **Remote Supabase Validation**: READY — Target schema contains `profiles`, `organizations`, `organization_members`, `exercises`, `workout_plans`, `v2_workout_sessions`, `exercise_sets`, `v2_nutrition_logs`, `water_logs`, `progress_statistics`, `attendance_logs`.

---

## 7. REMAINING LEGACY / MOCK INVENTORY

- `server.legacy.ts`: Isolated legacy prototype express server (inactive in active V2 runtime path).
- `LegacyWorkoutSessionRepository.ts`: Isolated legacy repository class, replaced in active V2 routes by `V2WorkoutSessionRepository`.
- `legacy/`: Legacy files preserved behind Git tag `v1-audit-checkpoint`.

---

## 8. PHASE 6 PREREQUISITES

Phase 5 domain APIs and data layer are complete, verified, and locked. Phase 6 (TRINETRA 12-Tool Intelligence Integration) can now safely consume the canonical REST API endpoints and domain services without bypassing security or domain rules.
