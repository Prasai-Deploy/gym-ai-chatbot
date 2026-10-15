# STRIVA V2 — PHASE 8A ARCHITECTURAL AUDIT
## Gym Owner OS — Architecture & Existing Implementation Audit

---

## 1. Executive Summary

This document represents the canonical Phase 8A architectural and existing-implementation audit of the **Gym Owner OS** within the STRIVA V2 codebase. Following the completion of the member product (Phases 7A–7C) and monetization foundation (Phases 7.5A–7.5G), this audit establishes the factual baseline of all B2B gym management, administrative, organizational, staff, member-management, attendance, analytics, and billing infrastructure currently existing in the repository.

### Key Audit Findings
1. **Frontend Disconnect & Prototype UI**: Over 77 components exist across `src/design-system/owner/` (26 components), `src/design-system/members/` (26 components), and `src/design-system/attendance/` (24 components), plus `src/design-system/trainer/` (25 components). However, nearly all contain hardcoded mock data, static arrays, and console-log action handlers. Furthermore, routes such as `/v3/members`, `/v3/trainer`, and `/v3/attendance` are **unregistered** in `src/router/index.tsx`, causing 404 or redirect-to-dashboard failures when clicked from the UI.
2. **Product Principle Violation in Existing UI**: The current UI presents an overwhelming "KPI Wall + Chart Wall + Table Wall" (e.g., `AttendanceLayout` stacks 18 cards/panels in a single screen; `TrainerWorkspaceLayout` stacks 24 components), completely violating the target STRIVA Gym Owner principle: **`STATE → ATTENTION → ACTION`**.
3. **Backend Domain Fragmentation**: Rather than dedicated domain modules, operational attendance endpoints (`/attendance/checkin`, `/attendance/checkout`, `/attendance/history`) and member analytics were placed inside `backend/src/modules/analytics/analytics.routes.ts`, performing raw inline Supabase queries that bypass domain service encapsulation.
4. **Critical Multi-Tenancy & RLS Vulnerabilities**:
   - `AdminRepository` operates with `supabaseAdmin` (service role) and executes global table counts across all `profiles`, `workout_sessions`, and `exercises` with zero tenant filtering.
   - `SubscriptionRepository.getAdminRevenueMetrics` aggregates platform-wide subscriptions with no organization filtering and calculates revenue using legacy USD rates ($19/$49).
   - Migration `008_multi_tenant_saas_foundation.sql` defined RLS policies using `current_setting('app.current_organization_id', true)`, which is **never set** by the backend connection pool.
   - Migration `011_phase3_tenant_rls_consolidation.sql` introduced `public.is_org_member(target_org_id UUID)` relying on `public.organization_members`, but `008` defined `public.organization_staff`. There is a schema ambiguity between `organization_members` and `organization_staff`.
5. **TRINETRA Boundary**: TRINETRA's `ToolRegistry` contains 12 active tools, 100% of which are member fitness tools (`get_profile`, `get_today_workout`, `log_workout`, etc.). Zero Gym Owner tools exist. The frontend displays a mock `OwnerTrinityAdvisor` component using legacy "Trinity" branding in violation of permanent agent rules.
6. **Billing Isolation**: Gym Owner navigation currently points to `/v3/billing`, which renders the consumer 14-day trial / single-plan membership checkout. B2B Gym Owner subscription billing does not yet exist.

---

## 2. Current Gym Owner Product State

| Functional Area | Current Status | Real vs Mock | Production Readiness |
| :--- | :--- | :--- | :--- |
| **Owner Dashboard** | Prototype | Fallback numbers + mock charts | **Unready** (Not wired to real tenant state) |
| **Member Management** | Prototype | 100% Mock arrays (5 static members) | **Unready** (Orphan route, not routed in Vite) |
| **Trainer / Staff Operations** | Prototype | 100% Mock ("Coach Elena", static schedule) | **Unready** (Orphan route, no staff mutations) |
| **Attendance & Turnstile** | Partial / Mock | Backend endpoints exist in analytics; Frontend is 100% mock | **Unready** (No attendance domain module; duplicate check-in unprotected) |
| **Analytics Engine** | Partial | Backend SQL aggregation engine exists; Frontend uses static SVG paths | **Partial** (Backend queries exist; needs tenant verification) |
| **Gym Owner Billing** | Missing | Pointing to B2C Member Billing | **Missing** (B2B SaaS subscription not implemented) |
| **Staff & Role Management** | Partial | `organization_staff` table exists; zero UI for invite/roster | **Partial** (No operational UI or API controller) |
| **TRINETRA Business Insights** | Mock UI | Static text string labeled "TRINITY BUSINESS OS" | **Unready** (Zero AI tools registered for organization) |

---

## 3. Existing Routes

### Route Inventory Table

| Route | Purpose | Role Required | Current Component / File | API Client Used | Data Source | Production Readiness | Recommended Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/admin` | Gym Owner Executive Overview | `Gym Owner`, `Admin` | [AdminDashboard.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/pages/AdminDashboard.tsx) | `useOwnerData()` -> `/analytics/executive` | Hardcoded fallback (`mrr: 48250`) | **Unready** | **Rewrite** into canonical `/gym/dashboard` with State-Attention-Action hierarchy |
| `/admin/*` | Catch-all for legacy admin | Protected | [AdminDashboard.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/pages/AdminDashboard.tsx) | N/A | Static | **Unready** | **Delete Later** once canonical routes are mounted |
| `/v3/members` | Member Roster Management | Owner / Manager | [V3MembersPage.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/v3/pages/V3MembersPage.tsx) | `useMembersData()` (Unused by layout) | Static mock array of 5 members | **Orphan** (Not in router!) | **Register & Rewrite** with TanStack Query against canonical domain API |
| `/v3/trainer` or `/v3/trainers` | Trainer Workspace & PT Clients | Trainer / Owner | [V3TrainerPage.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/v3/pages/V3TrainerPage.tsx) | `useTrainerData()` (Unused by layout) | 100% Static mock data | **Orphan** (Not in router!) | **Register & Rewrite** for staff schedule & client assignment |
| `/v3/attendance` | Front Desk & Turnstile Access | Front Desk / Owner | [V3AttendancePage.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/v3/pages/V3AttendancePage.tsx) | `useAttendanceData()` (Unused by layout) | 100% Static mock data | **Orphan** (Not in router!) | **Register & Connect** to canonical attendance service |
| `/v3/billing` | Billing Page | Member | [V3BillingPage.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/v3/pages/V3BillingPage.tsx) | `billingApi.getStatus()` | Real Consumer Supabase | **Consumer Only** | **Leave Alone** for members; create separate `/gym/billing` for B2B |
| `/admin/dashboard-data` | Legacy Admin Stats | `requireAdmin` | Backend route only | `adminApi.getDashboardData()` | Global Supabase count | **Dangerous** | **Deprecate** (Bypasses tenant isolation) |
| `/admin/members` | Legacy Admin Member List | `requireAdmin` | Backend route only | `adminApi.getMembers()` | Global profile select | **Dangerous** | **Deprecate** (Bypasses tenant isolation) |

### Route Disconnect Analysis
- In [Sidebar.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/shell/Sidebar.tsx#L62-L68), `businessRoutes` defines navigation to `/admin`, `/v3/members`, `/v3/trainers`, `/v3/attendance`, and `/v3/billing`.
- In [AdminDashboard.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/pages/AdminDashboard.tsx#L36-L40), navigation callbacks point to `/v3/members`, `/v3/trainer` (singular!), `/v3/attendance`, `/v3/billing`.
- In [src/router/index.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/router/index.tsx#L43-L67), **NONE** of `/v3/members`, `/v3/trainer`, `/v3/trainers`, or `/v3/attendance` are imported or registered. Any user clicking these links hits the catch-all redirect to `/v3/dashboard` or `/v3/*` (V3NotFoundPage).

---

## 4. Existing Frontend Components

### 4.1 Owner Suite (`src/design-system/owner/` — 26 files)
1. [GymDashboardLayout.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/owner/GymDashboardLayout.tsx): The master container for `/admin`. Fetches `useOwnerData()`, but hardcodes fallback numbers: `mrr || 48250`, `activeMembers || 1240`, `todayAttendance || 680`, `activeTrainers || 12`.
2. [MinimalOwnerHero.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/owner/MinimalOwnerHero.tsx): Top summary card displaying MRR, active members, check-ins, and active trainers. High visual quality, well-styled.
3. [OwnerTrendChart.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/owner/OwnerTrendChart.tsx): Hardcoded 12-week SVG polyline generator with hardcoded coordinate points (`[41000, 41800, ...]`) and hardcoded tab metrics.
4. [OwnerActionHighlights.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/owner/OwnerActionHighlights.tsx): Renders action items like "8 Membership Renewals Expiring", "Trainer Load Alert", "Peak Evening Floor Capacity Forecast" with mock IDs.
5. [OwnerTrinityAdvisor.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/owner/OwnerTrinityAdvisor.tsx): Card with hardcoded text `"Member retention is at 96.2%..."` labeled `TRINITY BUSINESS OS` (Violates AGENTS.md naming rule).
6. [SecondaryBusinessDetails.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/owner/SecondaryBusinessDetails.tsx): ARPU and ARR cards with hardcoded values.
7. *Other unmounted components*: `AIBusinessInsights.tsx`, `ActivityFeed.tsx`, `AttendanceCard.tsx`, `AttendanceHeatmap.tsx`, `BusinessHealth.tsx`, `BusinessHero.tsx`, `BusinessMetrics.tsx`, `MembershipCard.tsx`, `MembershipGrowth.tsx`, `OwnerSidebar.tsx`, `QuickActions.tsx`, `RecentPayments.tsx`, `RenewalAlerts.tsx`, `RevenueCard.tsx`, `RevenueChart.tsx`, `StaffSchedule.tsx`, `TodaysTasks.tsx`, `TopTrainers.tsx`, `TrainerCard.tsx`.

### 4.2 Member Management Suite (`src/design-system/members/` — 26 files)
1. [MemberManagementLayout.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/members/MemberManagementLayout.tsx): Master container. Embeds a static `mockMembers` array of 5 members: Marcus Vance, Sarah Jenkins, David Miller, Samantha Reed, Lucas Torrez.
2. [MemberHero.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/members/MemberHero.tsx): Hardcoded props `totalMembers={1240}`, `avgHealthScore={88}`, `churnRiskCount={14}`.
3. [MemberTable.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/members/MemberTable.tsx): Table rendering mock member records.
4. [MemberProfileDrawer.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/members/MemberProfileDrawer.tsx): Slide-over drawer with mock tabs for history, workouts, payments.
5. [AddMemberModal.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/members/AddMemberModal.tsx): Form modal with console.log submission.
6. *Other components*: `BulkActions.tsx`, `MemberSearch.tsx`, `MemberFilters.tsx`, `Segments.tsx`, `AIInsights.tsx`, `MemberStats.tsx`, `WorkoutHistory.tsx`, `NutritionHistory.tsx`, `AttendanceHistory.tsx`, `PaymentHistory.tsx`.

### 4.3 Attendance Suite (`src/design-system/attendance/` — 24 files)
1. [AttendanceLayout.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/attendance/AttendanceLayout.tsx): Extremely cluttered view containing 12 separate operational sections.
2. [LiveOccupancy.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/attendance/LiveOccupancy.tsx), [CheckInPanel.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/attendance/CheckInPanel.tsx), [CheckOutPanel.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/attendance/CheckOutPanel.tsx): Manual check-in/check-out UI.
3. [ScannerPanel.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/attendance/ScannerPanel.tsx), [QRScanner.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/attendance/QRScanner.tsx), [RFIDScanner.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/attendance/RFIDScanner.tsx): Hardware simulation mocks.
4. [EmergencyRollCall.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/attendance/EmergencyRollCall.tsx), [FrontDeskQueue.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/attendance/FrontDeskQueue.tsx), [SecurityAlerts.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/attendance/SecurityAlerts.tsx): Static emergency and alert panels.

### 4.4 Trainer Workspace Suite (`src/design-system/trainer/` — 25 files)
1. [TrainerWorkspaceLayout.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/trainer/TrainerWorkspaceLayout.tsx): Cluttered view containing 12 grid sections, all passing mock props to child components.

---

## 5. Existing API Layer

1. **`src/api/organizationApi.ts`**:
   - `getUserOrganizations()`: `GET /organizations`
   - `getCurrentOrganization()`: `GET /organizations/current`
   - `getOrganizationById(id)`: `GET /organizations/:id`
   - `getOrganizationLocations(id)`: `GET /organizations/:id/locations`
   - `getOrganizationMembers(id)`: `GET /organizations/:id/members`
   - `getOrganizationBranding()`: `GET /organizations/branding`
   - *Status*: Valid API client contract, but **completely uncalled** anywhere in the frontend.
2. **`src/api/adminApi.ts`**:
   - `getDashboardData()`: `GET /admin/dashboard-data`
   - `getMembers()`: `GET /admin/members`
   - `getPlans()`: `GET /admin/plans`
   - `getMembershipPlans()`: `GET /admin/membership-plans`
   - `assignPlan()`: `POST /admin/assign-plan`
   - *Status*: Bound to legacy admin module that bypasses tenant isolation; wrapped in `src/hooks/queries/useAdmin.ts`, which is also uncalled in the app.
3. **`src/hooks/useStrivaApi.ts`**:
   - `useOwnerData()`: Calls `GET /analytics/executive`.
   - `useTrainerData()`: Calls `GET /analytics/trainers`.
   - `useMembersData()`: Calls `GET /analytics/members`.
   - `useAttendanceData()`: Calls `GET /analytics/attendance` and listens to Supabase Realtime table `attendance_logs`.
   - `useBillingData()`: Calls `GET /billing/subscriptions` (legacy endpoint).

---

## 6. Organization Domain

### Backend Modules Structure
Located in [backend/src/modules/organization/](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/src/modules/organization/):
- **`organization.routes.ts`**: Enforces `requireAuth`, uses `tenantMiddleware` on `/current` and `/branding`. Defines routes `/`, `/current`, `/branding`, `/:id`, `/:id/locations`, `/:id/members`.
- **`organization.controller.ts`**: Validates membership via `service.isMember(orgId, userId)`. Fails closed if user is not in the organization.
- **`organization.service.ts`**: Delegates to `OrganizationRepository`.
- **`organization.repository.ts`**:
  - `findById`: Queries `organizations`.
  - `getLocations`: Queries `organization_locations`.
  - `getBranding`: Queries `organization_branding`.
  - `getStaff`: Queries `organization_staff`.
  - `getUserOrganizations`: Queries `organization_members` joined with `organizations`, plus `organizations.owner_id`.
  - `isMember`: Queries `organizations.owner_id === userId` OR `organization_members`.
  - `getMembers`: Queries `organization_members` joined with `profiles`.
  - `logAudit`: Inserts into `organization_audit_logs`.

### Hierarchy Mapping
```
Organization (public.organizations)
    │
    ├── Locations (public.organization_locations) [1:N]
    │
    ├── Staff (public.organization_staff) [1:N]
    │      └── Role Key ('Trainer', 'Front Desk', 'Gym Manager', etc.)
    │
    ├── Members (public.organization_members / profiles.organization_id) [1:N]
    │      └── Consumer Profiles & Workout/Nutrition Records
    │
    ├── Branding (public.organization_branding) [1:1]
    │
    └── Settings (public.organization_settings) [1:1]
```
*Assessment*: The domain service structure in `organization.service.ts` is solid and well-patterned, but suffers from schema ambiguity between `organization_staff` and `organization_members`.

---

## 7. Organization Data Model

### Migration Inventory: `backend/supabase/migrations/`

#### 1. `008_multi_tenant_saas_foundation.sql`
- **`organizations`**:
  - PK: `id UUID DEFAULT gen_random_uuid()`
  - Columns: `name VARCHAR(255)`, `slug VARCHAR(255) UNIQUE`, `status VARCHAR(50)`, timestamps.
  - *Risk*: `owner_id UUID` was **omitted** from the `CREATE TABLE` statement in migration 008, despite being referenced in later code and migration 011!
- **`organization_locations`**:
  - PK: `id UUID`
  - FK: `organization_id REFERENCES organizations(id) ON DELETE CASCADE`
  - Columns: `name`, `address`, `city`, `state`, `country`, `timezone`, `is_primary`.
- **`organization_branding`**:
  - PK: `id UUID`
  - FK: `organization_id UNIQUE REFERENCES organizations(id)`
  - Columns: `logo_url`, `primary_color`, `secondary_color`, `business_name`, `theme_mode`, `timezone`, `currency`, `country`.
- **`organization_settings`**:
  - PK: `id UUID`
  - FK: `organization_id UNIQUE REFERENCES organizations(id)`
  - Columns: `max_locations`, `allow_guest_passes`, `require_2fa`, `auto_dunning_enabled`.
- **`organization_roles` & `organization_permissions`**:
  - RBAC definition tables for custom role overrides.
- **`organization_staff`**:
  - PK: `id UUID`
  - FK: `organization_id`, `location_id REFERENCES organization_locations(id)`
  - Columns: `user_id UUID`, `role_key VARCHAR(50) DEFAULT 'Trainer'`.
- **`organization_invitations`**:
  - PK: `id UUID`
  - FK: `organization_id`
  - Columns: `email`, `role_key`, `token UNIQUE`, `status`, `expires_at`.
- **`organization_audit_logs`**:
  - PK: `id UUID`
  - FK: `organization_id`
  - Columns: `user_id`, `action`, `entity_type`, `entity_id`, `metadata JSONB`.

#### 2. `010_analytics_and_attendance.sql`
- **`attendance_logs`**:
  - PK: `id UUID DEFAULT gen_random_uuid()`
  - FKs: `organization_id REFERENCES organizations(id)`, `user_id REFERENCES auth.users(id)`, `location_id REFERENCES organization_locations(id)`.
  - Columns: `check_in_time TIMESTAMPTZ`, `check_out_time TIMESTAMPTZ`, `duration_minutes INT`, `status VARCHAR(50) DEFAULT 'completed'`.
  - Indexes: `idx_attendance_logs_org_checkin`, `idx_attendance_logs_user`.

#### 3. `011_phase3_tenant_rls_consolidation.sql`
- Defines helper `public.is_org_member(target_org_id UUID)`.
- Enforces RLS policies on `profiles`, `workout_plans`, `v2_workout_sessions`, `exercise_sets`, `v2_nutrition_logs`, `water_logs`, and `attendance_logs`.

---

## 8. Member Management Audit

### Current Capabilities vs Reality

| Capability | Supported in Backend? | Supported in Frontend? | Data Source |
| :--- | :--- | :--- | :--- |
| **Listing Members** | Partial (`GET /organizations/:id/members`, `GET /analytics/members`) | Mock only | Backend: `profiles` / `organization_members`. Frontend: 5 mock members. |
| **Searching Members** | Partial (Query params in `analytics.routes.ts`) | UI only | Frontend filters static array. |
| **Filtering by Status** | Partial | UI only | Frontend filters static array. |
| **Viewing Member Profile** | Yes (via identity domain) | Mock drawer | `MemberProfileDrawer` shows static mock stats. |
| **Membership Status** | Yes (`subscriptions` table) | Mock drawer | Shows hardcoded "Gold Pro Plan", "VIP Unlimited". |
| **Trial Status** | Yes (`profiles.trial_status`) | Not displayed | Frontend member table has no trial column. |
| **Attendance History** | Yes (`attendance_logs`) | Mock only | `AttendanceHistory.tsx` renders fake list. |
| **Workout History** | Yes (`v2_workout_sessions`) | Mock only | `WorkoutHistory.tsx` renders fake sessions. |
| **Assigned Trainer** | No schema table | Mock only | Hardcoded string `"Coach Elena"`. |

---

## 9. Trainer & Staff Audit

### Role Matrix Comparison

| Canonical RBAC Role | Backend Enum Supported? | Database Representation | Operations / APIs Supported |
| :--- | :--- | :--- | :--- |
| **Platform Super Admin** | Yes (`rbac.middleware.ts`) | `user_metadata.role` or `app_metadata.role` | Global bypass in middlewares |
| **Organization Owner** | Yes (`rbac.middleware.ts`) | `organizations.owner_id` or `organization_staff.role_key` | Full organization controller access |
| **Gym Manager** | Yes (`rbac.middleware.ts`) | `organization_staff.role_key = 'Gym Manager'` | Permitted via `requireAdmin` |
| **Trainer** | Yes (`rbac.middleware.ts`) | `organization_staff.role_key = 'Trainer'` | Only mock analytics (`/analytics/trainers`) |
| **Nutritionist** | Yes (`rbac.middleware.ts`) | `organization_staff.role_key = 'Nutritionist'` | No dedicated endpoints |
| **Front Desk** | Yes (`rbac.middleware.ts`) | `organization_staff.role_key = 'Front Desk'` | No dedicated endpoints |
| **Member** | Yes (`rbac.middleware.ts`) | Default fallback role | Consumer routes |
| **Demo User** | Yes (`rbac.middleware.ts`) | Special sandbox mode | Read-only sandbox simulation |

### Critical Gaps
1. **No Trainer-Client Relationship Table**: There is no database table linking a member (`user_id`) to an assigned trainer (`trainer_id`). All trainer-client associations in `src/design-system/trainer/` are hardcoded mocks.
2. **No Staff Invitation / Onboarding Workflow**: `organization_invitations` table exists in SQL, but there are no backend controllers, service methods, or frontend forms to invite staff members or accept invitations.
3. **Staff Roster Ambiguity**: Backend queries `organization_staff` in `AnalyticsRepository`, but `organization_members` in `tenant.middleware.ts`.

---

## 10. Attendance Audit

### Technical Status: PARTIAL & FRAGMENTED

```
               EXISTING ATTENDANCE ARCHITECTURE
               
Frontend:
[AttendanceLayout.tsx] (100% Mock, 18 components, QR/RFID fake scanners)
         │
         ▼ (DISCONNECTED - Route not in router.tsx)
Backend:
[analytics.routes.ts]
  ├── GET  /api/v1/analytics/attendance         (Aggregated stats via AttendanceAnalyticsEngine)
  ├── GET  /api/v1/analytics/attendance/history (Direct supabase.from('attendance_logs').select)
  ├── POST /api/v1/analytics/attendance/checkin (Direct supabase.from('attendance_logs').insert)
  └── POST /api/v1/analytics/attendance/checkout(Direct supabase.from('attendance_logs').update)
         │
Database:
[attendance_logs] (organization_id, user_id, check_in_time, check_out_time, status)
```

### Detailed Assessment
- **Check-In**: Partially implemented in `analytics.routes.ts`. However:
  - Bypasses domain service (raw SQL in route file).
  - No verification that `userId` is an active member of `organization_id`.
  - No check for duplicate active check-ins (a user can check in 100 times simultaneously).
  - No front-desk operator auditing (who logged the check-in?).
- **Check-Out**: Partially implemented via `attendanceId` lookup, but unvalidated.
- **Member Self Check-In vs Staff Check-In**: Not differentiated.
- **Hardware Integration**: Pure UI fiction (QR scanner and RFID scanner components generate fake timers).

---

## 11. Analytics Audit

### Metrics Inventory

| Metric | Calculation Location | Source Tables | Real vs Mock | Security & Tenant Scoping |
| :--- | :--- | :--- | :--- | :--- |
| **MRR / ARR** | `RevenueAnalyticsEngine.compute()` | `subscriptions`, `invoices` | Real calculation | Tenant scoped via `profiles.organization_id` member list |
| **Static MRR (Legacy)** | `SubscriptionRepository.getAdminRevenueMetrics()` | `subscriptions` | Legacy Mock rates ($19/$49) | **GLOBAL LEAK**: Zero tenant filter |
| **Daily Attendance** | `AttendanceAnalyticsEngine.compute()` | `attendance_logs` | Real calculation | Tenant scoped via `organization_id` |
| **Peak Hours** | `AttendanceAnalyticsEngine.compute()` | `attendance_logs` | Real calculation | Tenant scoped |
| **Active Members** | `MemberAnalyticsEngine.compute()` | `profiles`, `subscriptions` | Real calculation | Scoped via `profiles.organization_id` |
| **Trainer Utilization** | `TrainerAnalyticsEngine.compute()` | `workout_sessions`, `organization_staff` | Real calculation | Scoped via member list |
| **Retention Rate** | `RetentionAnalyticsEngine.compute()` | `subscriptions`, `attendance_logs` | Real calculation | Scoped via member list |
| **Frontend Charts** | `OwnerTrendChart.tsx` | N/A | **100% MOCK** | Hardcoded SVG coordinates |

### Findings
- The backend analytics engines (`backend/src/modules/analytics/AnalyticsEngines.ts`) are surprisingly sophisticated, containing real SQL aggregations for revenue, retention, peak hours, and attendance.
- **However**, the frontend completely ignores these engines and displays hardcoded SVG trendlines and static cards.

---

## 12. Billing & Revenue Audit

### Strict Boundary Separation

```
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│       CONSUMER MEMBER BILLING        │     │       GYM / B2B OWNER BILLING        │
├──────────────────────────────────────┤     ├──────────────────────────────────────┤
│ • Plan: Single STRIVA Membership     │     │ • Plan: STRIVA Gym Owner OS (SaaS)   │
│ • Price: ₹799/mo or ₹6,999/yr        │     │ • Multi-location license tiers       │
│ • Trial: 14-day full access          │     │ • Staff seat billing                 │
│ • Gateway: Razorpay Checkout         │     │ • B2B Invoicing & GST compliance     │
│ • Endpoints: /api/v1/billing/*       │     │ • Current Status: MISSING / UNBUILT  │
│ • UI: /v3/billing, /pricing          │     │ • Frontend Route: Currently None     │
│ • Phase: Completed in Phase 7.5      │     │ • Target: Phase 8H                   │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
```

- **Consumer System Integrity**: The consumer billing system established in Phase 7.5 (Razorpay HMAC validation, entitlement engine, trial lifecycle) is functioning and must remain untouched.
- **Owner Billing Status**: Currently, `AdminDashboard` has a button pointing to `/v3/billing`. When clicked, it renders the Gym Owner's personal consumer workout subscription dashboard. There is no B2B subscription model currently active in the application.

---

## 13. Security & Authorization Audit

### Conceptual Access Matrix Evaluation

| Threat Vector | Can Scenario Occur? | Why / Mechanism | Risk Level |
| :--- | :---: | :--- | :---: |
| **Owner A accesses Org B via API** | **NO** (Blocked) | `tenantMiddleware` validates JWT against DB memberships and rejects spoofed `x-organization-id` with 403. | **Protected** |
| **Manager A accesses Org B via API** | **NO** (Blocked) | Enforced by `tenantMiddleware` fail-closed logic. | **Protected** |
| **Trainer accesses arbitrary member** | **YES** (Potential) | RLS policy `"Gym staff view tenant member profiles"` allows any staff member to view ANY member of their tenant, but no trainer-client restriction exists. | **Medium** |
| **Front Desk accesses financial metrics** | **YES** (Potential) | `/api/v1/analytics/revenue` checks `requireAuth` and `tenantMiddleware`, but does NOT enforce `requireRoles(['Organization Owner', 'Gym Manager'])`! | **HIGH** |
| **Member accesses Gym Owner dashboard** | **YES** (Potential) | `/admin` frontend route checks `ProtectedRoute`, but does NOT enforce role. Any member typing `/admin` in the browser loads `AdminDashboard`. | **HIGH** |
| **Global Data Leak via Legacy Admin API** | **YES** (Definite) | `/api/v1/admin/dashboard-data` counts all profiles in the entire database using service-role `supabaseAdmin`. | **CRITICAL** |

---

## 14. Row Level Security (RLS) Audit

### STATIC POLICY REVIEW vs LIVE DATABASE VERIFICATION

> [!IMPORTANT]
> **Static Policy Review Only**: In accordance with Phase 8A rules, no live database modifications or destructive tests were conducted. The findings below are derived from static analysis of canonical migration files.

#### Static Policy Review Findings:
1. **Migration 008 Flaw (`current_setting`)**:
   - Migration `008_multi_tenant_saas_foundation.sql` defined:
     ```sql
     CREATE POLICY "Tenant organization access policy" ON public.organizations
     USING (id = NULLIF(current_setting('app.current_organization_id', true), '')::UUID);
     ```
   - In Supabase pooled REST connections, `current_setting('app.current_organization_id')` is **never set** by the Express backend.
   - Consequently, any direct client query to `organizations`, `organization_locations`, or `organization_staff` fails closed (returns 0 rows).
2. **Migration 011 Hardening (`is_org_member`)**:
   - Migration `011_phase3_tenant_rls_consolidation.sql` successfully hardened `profiles`, `workout_plans`, `v2_workout_sessions`, `exercise_sets`, `v2_nutrition_logs`, `water_logs`, and `attendance_logs` using `public.is_org_member(organization_id)`.
   - However, migration 011 **did not rewrite** the policies for `organizations`, `organization_locations`, or `organization_staff`.

---

## 15. Tenant Model Audit

### Server-Side Tenant Resolution Verification
In [tenant.middleware.ts](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/src/middleware/tenant.middleware.ts):
- Evaluates `req.user.id` from Supabase Auth JWT.
- Queries `organization_members` and `organizations.owner_id`.
- Rejects requested `x-organization-id` if the user is not a verified database member (`ForbiddenError 403`).
- **Verdict**: Complies with `AGENTS.md` Rule 5 ("No Client-Controlled Tenant Headers") and Rule 6 ("No Hardcoded Tenant IDs").
- **Gap**: Fallback logic defaults to the first organization membership if no header is supplied. Multi-location context (`x-location-id`) is parsed from header without database location-membership verification.

---

## 16. TRINETRA + Gym Owner Boundary

### Operational Intelligence Architecture

```
                       CANONICAL TRINETRA B2B PATTERN
                       
     Gym Owner / Manager Prompt:
     "Which members are at risk of churning this week?"
                            │
                            ▼
     TRINETRA AI Runtime (AgentRunner / PromptComposer)
                            │
                            ▼
     Tool Permission Engine (Checks Role: 'Organization Owner' | 'Gym Manager')
                            │
                            ▼
     ToolRegistry: 'get_member_retention_risks'
                            │
                            ▼
     Domain Service (AttendanceService / MemberService)
                            │
                            ▼
     PostgreSQL Tenant-Scoped Database (Scoped strictly to orgId)
```

- **Current State**: TRINETRA's `ToolRegistry` contains **0** organization/owner tools.
- **Frontend Violation**: `OwnerTrinityAdvisor.tsx` hardcodes static English text with legacy "TRINITY" naming.
- **Future Architecture**: In Phase 8, TRINETRA must access gym data strictly through registered domain tools (`GetAtRiskMembersTool`, `GetAttendanceSummaryTool`, `GetExpiringMembershipsTool`) that delegate to domain services, never executing raw SQL.

---

## 17. Notification / Attention System Audit

1. **`backend/src/modules/notification/`**:
   - Contains `AutomationEngine.ts`, `NotificationDispatcher.ts`, `RuleEngine.ts`, `Scheduler.ts`.
   - **Status**: Completely mocked abstractions (`MockEmailProvider`, `MockSMSProvider`, `MockPushProvider`, `MockWhatsAppProvider`).
   - Not mounted in `backend/src/app/app.ts`. Zero HTTP routes.
2. **Attention Architecture Gap**:
   - Gym owners need proactive **ATTENTION alerts** (e.g., "3 members haven't visited in 7 days", "2 trainer schedules conflicting").
   - Currently, attention logic is hardcoded inside `OwnerActionHighlights.tsx`.

---

## 18. Design System Audit

### Reusable Canonical Primitives in `src/design-system/components/`
The following components are production-ready and must be reused for Gym Owner OS without adding duplicate UI libraries:

| Component | Status | Gym Owner OS Use Case |
| :--- | :--- | :--- |
| [Button.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/components/Button.tsx) | Ready | Primary actions, check-in buttons, filters |
| [Card.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/components/Card.tsx) / [GlassCard.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/components/GlassCard.tsx) | Ready | State cards, Attention alert cards |
| [Badge.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/components/Badge.tsx) | Ready | Status badges (Active, Expiring, At-Risk, Trial) |
| [Modal.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/components/Modal.tsx) / [Drawer.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/components/Drawer.tsx) | Ready | Member detail inspection drawer, add member modal |
| [Tabs.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/components/Tabs.tsx) | Ready | State switching (Floor, Roster, Schedules) |
| [SearchBar.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/components/SearchBar.tsx) / [Input.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/components/Input.tsx) | Ready | Member & visitor search bar |
| [LoadingSkeleton.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/components/LoadingSkeleton.tsx) | Ready | Shimmer state during query loading |
| [EmptyState.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/components/EmptyState.tsx) | Ready | Zero check-ins, zero attention items |
| [StatCard.tsx](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/design-system/components/StatCard.tsx) | Ready | High-level metrics |

---

## 19. Responsive & Mobile Audit

1. **Desktop**: Existing layouts (`GymDashboardLayout`, `MemberManagementLayout`) are desktop-centric with large card grids, but suffer from cognitive clutter.
2. **Tablet**: Functional, but sidebars take up excessive screen width; table components overflow horizontally.
3. **Mobile**:
   - `AppShell.tsx` and `MobileBottomNav.tsx` exist, but `MobileBottomNav` only lists member navigation (`Home`, `Coach`, `Workout`, `Nutrition`, `Progress`).
   - When a Gym Owner logs in on a mobile device, there is no bottom navigation for gym management.
   - Target for Phase 8: Desktop-first owner workflows, with clean mobile-responsive operational views (quick check-in, member lookup).

---

## 20. Mock / Hardcode Inventory

| File | Exact Location | What is Mocked / Hardcoded | Replacement Source | Priority |
| :--- | :--- | :--- | :--- | :--- |
| `src/design-system/owner/GymDashboardLayout.tsx` | Lines 31–34 | Fallbacks: `mrr || 48250`, `activeMembers || 1240`, `todayAttendance || 680`, `activeTrainers || 12` | Live `useOwnerData()` without static fallback | **HIGH** |
| `src/design-system/owner/GymDashboardLayout.tsx` | Lines 75–78 | Static advisor text & "TRINITY" name | Real TRINETRA Tool or Attention Engine | **HIGH** |
| `src/design-system/owner/OwnerTrendChart.tsx` | Lines 10–39 | 12-week static point arrays (`[41000, 41800, ...]`) | Real backend analytics trend series | **MEDIUM** |
| `src/design-system/owner/OwnerActionHighlights.tsx` | Lines 31–62 | Hardcoded array of 3 attention items | Real Attention Engine query | **HIGH** |
| `src/design-system/members/MemberManagementLayout.tsx` | Lines 31–37 | Static array of 5 members | TanStack Query to `GET /api/v1/organizations/:id/members` | **CRITICAL** |
| `src/design-system/members/MemberHero.tsx` | Line 50 | `totalMembers={1240}`, `avgHealthScore={88}`, `churnRiskCount={14}` | Real organization member statistics | **HIGH** |
| `src/design-system/attendance/AttendanceLayout.tsx` | Lines 37–45 | `occupancyCount={142}`, `maxCapacity={200}`, `totalCheckinsToday={680}` | Live Supabase turnstile count | **HIGH** |
| `src/design-system/trainer/TrainerWorkspaceLayout.tsx` | Lines 32, 41 | Trainer name `"Coach Elena"`, static client roster | Real authenticated trainer profile & roster | **HIGH** |
| `backend/src/modules/admin/repositories/AdminRepository.ts` | Lines 18–29 | Global `profiles`, `workout_sessions`, `exercises` count | Tenant-scoped repository queries | **CRITICAL** |
| `backend/src/modules/billing/repositories/SubscriptionRepository.ts` | Lines 256–262 | Hardcoded USD rates: `$19`, `$49` and Stripe tiers | Canonical Razorpay single STRIVA membership | **HIGH** |
| `backend/src/modules/analytics/analytics.routes.ts` | Lines 95–138 | Raw direct Supabase queries for checkin/checkout | Canonical `AttendanceService` | **CRITICAL** |

---

## 21. Reuse / Rewrite / Merge / Delete

### REUSE (Production-Ready Foundations)
- `backend/src/middleware/tenant.middleware.ts`: Server-side organization membership resolution.
- `backend/src/middleware/rbac.middleware.ts`: Role validation middleware.
- `backend/src/modules/organization/organization.service.ts` & `organization.controller.ts`: Tenant details, branding, location endpoints.
- `backend/src/modules/analytics/AnalyticsEngines.ts`: Core SQL aggregation algorithms for revenue, retention, and peak hours.
- `src/design-system/components/*`: All canonical atomic design system primitives.

### REWRITE (Insufficient / Mocked Implementations)
- `src/pages/AdminDashboard.tsx` & `src/design-system/owner/GymDashboardLayout.tsx`: Rewrite to conform to **State → Attention → Action**.
- `src/design-system/members/MemberManagementLayout.tsx`: Rewrite to connect to live tenant API with pagination, search, and member profile inspection.
- Attendance Check-in / Check-out: Rewrite into a dedicated `AttendanceService` with duplicate check-in prevention and operator auditing.
- `src/design-system/owner/OwnerTrinityAdvisor.tsx`: Rewrite to canonical TRINETRA branding with real tool data.

### MERGE (Duplicate Functionality)
- `backend/src/modules/admin/` + `backend/src/modules/organization/`: Merge legacy admin routes into canonical tenant-scoped organization routes. Deprecate global `AdminRepository`.
- `backend/src/modules/analytics/analytics.routes.ts` attendance endpoints: Move into a dedicated `backend/src/modules/attendance/` module.
- `organization_staff` vs `organization_members`: Unify role assignment and membership queries into a consistent schema structure.

### DELETE LATER (Obsolete Implementations)
- Unmounted mock visual components (`src/design-system/owner/AttendanceHeatmap.tsx`, `RFIDScanner.tsx`, `GuestPass.tsx`, etc.).
- Static legacy mock hooks (`src/hooks/queries/useAdmin.ts`).

---

## 22. Recommended Target Architecture

```
backend/src/modules/
├── organization/         # Organization profile, locations, branding, settings
│   ├── organization.controller.ts
│   ├── organization.service.ts
│   ├── organization.repository.ts
│   └── organization.routes.ts
│
├── members/              # Organization member directory, status, profiles
│   ├── member.controller.ts
│   ├── member.service.ts
│   ├── member.repository.ts
│   └── member.routes.ts
│
├── staff/                # Staff roster, trainer-client assignments, roles
│   ├── staff.controller.ts
│   ├── staff.service.ts
│   ├── staff.repository.ts
│   └── staff.routes.ts
│
├── attendance/           # Check-in, check-out, live occupancy, history
│   ├── attendance.controller.ts
│   ├── attendance.service.ts
│   ├── attendance.repository.ts
│   └── attendance.routes.ts
│
├── analytics/            # Tenant KPI calculations, executive reports
│   ├── AnalyticsEngines.ts
│   ├── AnalyticsEngine.ts
│   └── analytics.routes.ts
│
└── ai/tools/impl/        # TRINETRA Gym Owner B2B Tools
    ├── GetAtRiskMembersTool.ts
    ├── GetAttendanceSummaryTool.ts
    └── GetExpiringMembershipsTool.ts
```

---

## 23. Recommended Frontend Architecture

```
src/views/gym/
├── GymDashboard/         # State → Attention → Action Executive View
│   ├── GymDashboardPage.tsx
│   ├── FacilityStateBanner.tsx
│   ├── AttentionFeed.tsx
│   └── ActionPanel.tsx
│
├── Members/              # Member directory & inspection
│   ├── GymMembersPage.tsx
│   ├── MemberTable.tsx
│   └── MemberDetailDrawer.tsx
│
├── Staff/                # Staff roster & trainer management
│   ├── StaffRosterPage.tsx
│   └── TrainerClientAssignmentModal.tsx
│
├── Attendance/           # Front desk turnstile & occupancy
│   ├── AttendancePage.tsx
│   ├── LiveFloorOccupancy.tsx
│   └── FastCheckInInput.tsx
│
├── Analytics/            # Deep-dive business analytics
│   └── GymAnalyticsPage.tsx
│
└── Billing/              # Organization B2B subscription & invoices
    └── GymBillingPage.tsx
```

---

## 24. Owner Dashboard Concept

The dashboard must adhere strictly to the product principle:
**`STATE → ATTENTION → ACTION`**

```
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: STATE                                                         │
│ "GOOD MORNING, STRIVA METRO FLAGSHIP"                                  │
│ 128 Active Members · 18 Check-ins Today · 142 Current Occupants        │
├────────────────────────────────────────────────────────────────────────┤
│ LEVEL 2: ATTENTION                                                     │
│ ⚠️ 3 members haven't visited in 7+ days (Churn risk)                   │
│ ⚠️ 8 memberships expiring within 48 hours                              │
│ ⚠️ 1 trainer roster near capacity (Marcus at 95%)                      │
├────────────────────────────────────────────────────────────────────────┤
│ LEVEL 3: ACTION                                                        │
│ [ Review At-Risk Members → ]   [ Send Renewal Notice → ]               │
│ [ Check In Member ]            [ Reassign Trainer Clients → ]          │
├────────────────────────────────────────────────────────────────────────┤
│ LEVEL 4: SUPPORTING METRICS (Collapsed by default / Clean cards)       │
│ • Monthly Revenue: ₹94,200 (↑ 8.4% vs last mo)                         │
│ • Peak Floor Hours: 6:00 PM – 8:00 PM                                  │
│ • TRINETRA Coach Insight: "Retention is 96.2%. Re-engaging 3 members..."│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 25. Multi-Location Consideration

- **Schema**: `organization_locations` table exists in PostgreSQL, linked by `organization_id`.
- **Backend Context**: `tenant.middleware.ts` reads `x-location-id` header and attaches it to `req.organizationContext.locationId`.
- **Gaps**:
  - No check that `locationId` belongs to `organizationId`.
  - Attendance logs support `location_id`, but queries currently ignore it unless explicitly filtered.
  - Phase 8 must ensure single-location gyms work out-of-the-box (default primary location) while allowing multi-location gyms to filter members, attendance, and staff by location.

---

## 26. Member vs Owner Data Boundary

| Data Type | Member Visibility | Gym Owner Visibility | Staff (Trainer/Front Desk) |
| :--- | :--- | :--- | :--- |
| **Personal Fitness Profile** | Full Read/Write | Read-Only (Safety/Medical notes) | Read-Only (Assigned clients only) |
| **Workout Logs / Sets** | Full Read/Write | Operational Stats / Summary | Read/Feedback (Assigned clients only) |
| **Attendance Check-ins** | View Own | Full Organization Log | Read/Write (Check-in/out operations) |
| **Billing / Payment Cards** | View Own Payment | **Zero Access** to Member Card Details; View Membership Status Only | **Zero Access** |
| **Gym Financial Revenue** | **Zero Access** | Full Read (MRR, Invoices, ARPU) | **Zero Access** |

---

## 27. Billing Boundary

- **Consumer Subscription**: Handled via `subscriptions` and `invoices` tied to `user_id`. ₹799/mo or ₹6,999/yr Razorpay auto-recurring.
- **Gym Owner SaaS Subscription**: Must be tied to `organization_id` in a separate `organization_subscriptions` table or multi-tenant billing structure. Must never overwrite or conflict with a gym owner's personal consumer workout subscription.

---

## 28. Testing Coverage Audit

| Test Suite | File | What is Covered | What is Missing |
| :--- | :--- | :--- | :--- |
| **Admin Auth Security** | `admin_auth.security.test.ts` | Role validation (`requireAdmin`), header spoofing prevention | Live DB verification, tenant isolation |
| **Analytics Security** | `analytics.security.test.ts` | Unit tests for KPI calculations against in-memory mock | Real PostgreSQL execution, attendance security |
| **Tenant Isolation** | `phase4_tenant_auth.security.test.ts` | `tenantMiddleware` fail-closed behavior on spoofed headers | Multi-location isolation tests |
| **RLS Policy Invariants** | `rls.security.test.ts` | Static inspection of migration 008 text | Tests for migration 011; live database execution |
| **Attendance Operations** | None | None | Unit and security tests for check-in/out, duplicate protection |
| **Member Management** | None | None | Tests for search, filtering, member profile access controls |

---

## 29. Build Baseline

All builds and tests were executed in non-destructive read-only validation:
- **Frontend Build (`vite build`)**: **PASS** (4.39s, 0 errors, 35 chunks generated).
- **Backend Build (`tsc && tsc-alias`)**: **PASS** (0 errors).
- **Existing Test Suite (`vitest run`)**: **PASS** (**21 test files passed, 284 tests passed out of 284**).

---

## 30. File Modification Rule & Git Status Verification

- **Production Code Modified**: **NONE**.
- **Database Migrations Added**: **NONE**.
- **Files Deleted or Renamed**: **NONE**.
- **Unintended Changes Reverted**: None required.
- **Single Permitted Artifact Created**: `docs/STRIVA_V2_PHASE_8A_GYM_OWNER_AUDIT.md`.

---

## 31. Phase 8 Recommendations

1. **Do NOT reuse the cluttered UI layouts**: Strip away the 18-panel and 24-panel layouts in favor of the **State → Attention → Action** paradigm.
2. **Isolate Attendance into a First-Class Domain Module**: Extract attendance logic from `analytics.routes.ts` into a dedicated `backend/src/modules/attendance/` domain module with business rule validation.
3. **Resolve Schema Ambiguity**: Unify `organization_staff` and `organization_members` references, and ensure `owner_id` on `organizations` is formally reconciled in migrations.
4. **Enforce Role Guards on Financial Analytics**: Guard `/api/v1/analytics/revenue` with `requireRoles(['Organization Owner', 'Gym Manager', 'Platform Super Admin'])` to prevent front-desk staff or members from accessing revenue figures.
5. **Implement TRINETRA Gym Owner Tools**: Add validated B2B tools to `ToolRegistry` delegating strictly to domain services.

---

## 32. Recommended Phase 8 Implementation Order

Based on the audit findings, the optimal implementation sequence is:

- **Phase 8A**: **Audit & Architecture Baseline** *(Completed herein)*
- **Phase 8B**: **Organization, Location & Staff Foundation** (Fix schema ambiguity between `organization_staff` and `organization_members`, reconcile `owner_id`, implement staff roster API and invitation flow).
- **Phase 8C**: **Member Directory & Operational Profiles** (Connect frontend to live `profiles` & `organization_members` data, implement search, filters, and member drawer).
- **Phase 8D**: **Canonical Attendance & Turnstile Domain** (Create dedicated `attendance` module, implement check-in/out with duplicate prevention, fast front-desk check-in UI).
- **Phase 8E**: **Trainer Workspace & Client Assignments** (Implement trainer-client association model, trainer client roster, and session schedule views).
- **Phase 8F**: **Gym Owner OS Dashboard (State → Attention → Action)** (Implement canonical executive dashboard following the 3-level information hierarchy).
- **Phase 8G**: **Tenant Analytics & Reporting** (Wire frontend trendlines and metrics to real `AnalyticsEngines` calculations).
- **Phase 8H**: **Gym Owner B2B Billing** (Design organization SaaS subscription foundation, separate from consumer member billing).
- **Phase 8I**: **TRINETRA Gym Intelligence Tools** (Register B2B operational tools in `ToolRegistry` for natural language attention queries).
- **Phase 8J**: **Security Hardening, RBAC Gate & E2E Verification** (Verify cross-tenant boundary security, live RLS tests, complete end-to-end operational flow).

---

## 33. Open Questions & Architectural Decisions

1. **Membership Model**: Does a user belong to an organization via `profiles.organization_id`, `organization_members`, or both?
   - *Recommendation*: `organization_members` as the source of truth for multi-membership and roles; `profiles.organization_id` as the active primary context.
2. **Trainer-Client Assignments**: Should this be a new table `trainer_client_assignments (organization_id, trainer_id, member_id, created_at)`?
   - *Recommendation*: Yes, introduced in Phase 8E.
3. **Front-Desk Hardware**: Should STRIVA integrate with physical turnstiles via webhooks or WebSockets?
   - *Recommendation*: Provide a simple QR scan API and turnstile webhook endpoint; avoid maintaining mock UI hardware simulators.

---

## 34. Risks

1. **Cross-Tenant Data Leak via Admin Module**: If legacy `/api/v1/admin/*` endpoints remain active without tenant scoping, malicious users with admin roles could query platform-wide member data.
2. **RLS Policy Drift**: If tables relying on `current_setting('app.current_organization_id')` are queried directly by frontend Supabase clients without service role, they fail silently.
3. **UI Overload**: Re-introducing complex KPI grids will degrade user experience for gym owners who need fast operational clarity.

---

## 35. Phase 8A Conclusion

Phase 8A has successfully determined the exact state of all Gym Owner functionality in the STRIVA V2 repository. The foundation is robust in its core authentication, tenant middleware, and backend calculation engines, but severely disconnected and mocked on the frontend. With this audit complete and all findings systematically cataloged, the path forward for **Phase 8B (Organization, Location & Staff Foundation)** is clearly mapped.

**NO PRODUCTION CODE WAS MODIFIED DURING THIS AUDIT.**
