# STRIVA V2 — PHASE 8B: ORGANIZATION, LOCATION & STAFF FOUNDATION SPECIFICATION

## Objective

Phase 8B establishes the canonical backend multi-tenant foundation for STRIVA V2 Organizations, Locations, Memberships, Staff Rosters, Invitations, and Attendance Boundaries. It directly remediates critical security vulnerabilities, architecture gaps, and data leakage identified during the Phase 8A Gym Owner OS Audit, without creating Gym Owner frontend UI or modifying consumer Stripe/Razorpay monetization architecture.

---

## Existing Organization Architecture

Prior to Phase 8B, the repository exhibited fractured multi-tenancy models across database migrations and application code:
1. **Model Fragmentation**: Dual tables `organization_members` (Migration 000/011) and `organization_staff` (Migration 008) overlapped in duties, creating schema ambiguity.
2. **Missing Owner Identifier**: `public.organizations` omitted an authoritative `owner_id` foreign key.
3. **Flawed RLS Mechanism**: Migration 008 defined Row-Level Security policies referencing `current_setting('app.current_organization_id', true)` which was never bound in normal Supabase JWT sessions, creating policy bypasses or failures.
4. **Global Tenant Leaks**:
   - `AdminRepository.getDashboardStats()` and `getMembers()` executed global queries across all profiles, workouts, and exercises using service-role `supabaseAdmin`.
   - `SubscriptionRepository.getAdminRevenueMetrics()` queried global subscriptions and computed metrics using legacy hardcoded USD values.
5. **Authorization Gaps**:
   - `/api/v1/analytics/revenue` had no role-based authorization guards, allowing ordinary Members or Trainers to view organization financial statistics.
   - Attendance check-in (`/api/v1/analytics/attendance/checkin`) accepted unverified `userId` parameters with raw SQL execution in route handlers, allowing any user to check in arbitrary accounts without membership validation.

---

## Canonical Organization Model

STRIVA V2 establishes a single hierarchical tenant tree rooted in `organizations`:

```
Organization (id, name, owner_id, status)
    │
    ├── Locations (id, organization_id, name, address, is_primary, status)
    │
    ├── Memberships (id, organization_id, user_id, role, location_id, status)
    │     ├── Staff (Roles: Organization Owner, Gym Manager, Trainer, Nutritionist, Front Desk)
    │     └── Members (Role: Member)
    │
    ├── Invitations (id, organization_id, email, role_key, token, location_id, invited_by, status, expires_at)
    │
    ├── Branding (id, organization_id, primary_color, secondary_color, logo_url, favicon_url)
    │
    ├── Settings (id, organization_id, allow_member_checkin, timezone, currency)
    │
    └── Audit Log (id, organization_id, user_id, action, target_type, target_id, metadata, created_at)
```

---

## Organization / Staff Reconciliation

1. **Canonical Membership Table**: `public.organization_members` is established as the sole source of truth for organization membership and roles.
2. **Role Granularity**: The `role` column in `organization_members` distinguishes between staff and regular gym members:
   - Staff: `'Organization Owner'`, `'Gym Manager'`, `'Trainer'`, `'Nutritionist'`, `'Front Desk'`
   - Member: `'Member'`
3. **Migration & Deprecation**: Legacy `public.organization_staff` is marked deprecated. Existing records are backfilled into `organization_members` idempotently via `INSERT ... ON CONFLICT (organization_id, user_id) DO NOTHING`.
4. **Backend Query Layer**: `OrganizationRepository.getStaff()` queries `organization_members` filtered by `role != 'Member'`, including profile details, falling back gracefully to legacy `organization_staff` if required for backwards compatibility.

---

## Owner Model

- **Dual Invariant**:
  1. `public.organizations.owner_id` references `auth.users(id)` and stores the primary owner identity.
  2. `public.organization_members` contains a corresponding record with `role = 'Organization Owner'`.
- **Authority**: Both mechanisms are synchronized. When an organization is created or transferred, both `owner_id` and the `organization_members` record are updated in a single transaction.
- **Fail-Closed Resolution**: If an owner lacks an explicit membership row, server-side `tenantMiddleware` resolves `Organization Owner` privileges via `organizations.owner_id`.

---

## Location Model

- Table: `public.organization_locations`
- Fields: `id`, `organization_id`, `name`, `address`, `city`, `state`, `postal_code`, `country`, `is_primary`, `status`, `created_at`, `updated_at`.
- Scoping Matrix:
  - **Organization Owner**: Unrestricted access across all locations within their organization.
  - **Gym Manager**: Authorized to manage operations within assigned locations or all organization branches.
  - **Trainer / Nutritionist**: Scoped to assigned location for schedule and client sessions.
  - **Front Desk**: Scoped to operational branch for front-counter check-in.
  - **Member**: Scoped to subscribed home gym location or multi-club pass permissions.

---

## Tenant Resolution

Server-side tenant resolution in `tenant.middleware.ts` enforces strict invariants:
1. **Server-Authoritative**: Tenant identity is resolved from the authenticated Supabase JWT (`auth.uid()`) queried against database memberships in `organization_members` and `organizations.owner_id`.
2. **No Header Spoofing**: The client header `x-organization-id` is treated strictly as a *requested* context. If the authenticated user is not a verified member or owner of the requested organization, the request fails closed with `403 Forbidden`.
3. **No Fallbacks**: Fallback tenant UUIDs (`00000000-0000-0000-0000-000000000001`) are eradicated.
4. **Context Injection**: Valid requests receive `req.organizationContext = { organizationId, locationId, roleKey }`.

---

## RLS Model

1. **Elimination of `current_setting`**: Migration `phase_8b_organization_staff_foundation.sql` drops obsolete policies from migration 008 that relied on uninitialized session settings.
2. **Canonical Helpers**: Uses `public.is_org_member(org_id uuid)` and `auth.uid()`.
3. **Fail-Closed Table Policies**:
   - `organizations`: SELECT allowed if `is_org_member(id) OR owner_id = auth.uid()`. UPDATE allowed for owner or Organization Owner/Platform Super Admin.
   - `organization_members`: SELECT allowed for tenant members. ALL modifications restricted to Organization Owner, Gym Manager, or Platform Super Admin.
   - `organization_locations`, `organization_branding`, `organization_settings`, `organization_invitations`, `organization_audit_logs`: SELECT restricted to tenant members/staff; mutations strictly restricted to owners/managers.

---

## Invitation Flow

1. **Issuance**: Owner or Manager calls `POST /api/v1/organizations/current/invitations` with email and target role (`Trainer`, `Front Desk`, `Gym Manager`, `Nutritionist`, `Member`).
2. **Token Generation**: Generates 256-bit cryptographically secure token with a 7-day expiration timestamp.
3. **Escalation Guards**:
   - Organization Owners cannot invite `Platform Super Admin`.
   - Gym Managers cannot invite `Organization Owner` or other `Gym Managers`.
   - Demo Users cannot issue invitations.
4. **Acceptance**: Authenticated user calls `POST /api/v1/organizations/invitations/accept` with token:
   - Validates token exists, status is `pending`, and `expires_at > NOW()`.
   - Validates authenticated user email matches invitation recipient email.
   - Blocks Demo User (`demo@sweatfix.com`).
   - Inserts/updates `organization_members` with target role.
   - Marks invitation status as `accepted` and emits an audit event.

---

## Role Assignment Rules

| Caller Role | Permitted Target Roles | Privilege Escalation Blocked |
| :--- | :--- | :--- |
| **Platform Super Admin** | All platform and organization roles | N/A |
| **Organization Owner** | Gym Manager, Trainer, Nutritionist, Front Desk, Member | Cannot grant Platform Super Admin |
| **Gym Manager** | Trainer, Nutritionist, Front Desk, Member | Cannot grant Platform Super Admin, Organization Owner, or Gym Manager |
| **Trainer / Nutritionist** | None | Cannot modify or assign roles |
| **Front Desk** | None | Cannot modify or assign roles |
| **Member** | None | Cannot self-promote or assign roles |
| **Demo User** | None | Strictly sandboxed from staff roles |

---

## Financial Authorization

Financial analytics endpoints (`/api/v1/analytics/revenue`, `/api/v1/analytics/executive`, `/api/v1/analytics/kpis`) are guarded with backend RBAC middleware:
- **Allowed**: `Platform Super Admin`, `Organization Owner`, `Gym Manager`
- **Denied (403 Forbidden)**: `Front Desk`, `Trainer`, `Nutritionist`, `Member`, `Demo User`

---

## Attendance Authorization

1. **Domain Encapsulation**: Created canonical module `backend/src/modules/attendance/` with `AttendanceRepository`, `AttendanceService`, `AttendanceController`, and `attendanceRouter`.
2. **Caller Validation**:
   - Self check-in: Allowed for authenticated members within their own organization.
   - Check-in of others: Restricted strictly to staff roles (`Platform Super Admin`, `Organization Owner`, `Gym Manager`, `Front Desk`, `Trainer`).
   - Members cannot check in other members.
3. **Target Validation**: Target `userId` must belong to the caller's organization.
4. **Duplicate Protection**: Prevents duplicate active check-ins within a 12-hour window.
5. **Checkout Validation**: Members can only check out their own session; staff can check out any session in their organization.

---

## Platform vs Organization Admin

- **Platform Super Admin**: System-wide administrative role with access to `/api/v1/billing/admin/metrics`, `/api/v1/admin/dashboard-data`, and cross-organization operations.
- **Gym Owner / Organization Owner**: Tenant-scoped role with authority only over their own organization and locations.
- **Data Boundary**: `AdminRepository.getDashboardStats()` and `AdminRepository.getMembers()` require an explicit `organizationId` unless the caller is verified as `Platform Super Admin`.

---

## Consumer Billing Isolation

- **Independent Systems**: Consumer membership billing (₹799/month, ₹6,999/year, 14-day trial, Razorpay HMAC) remains completely isolated from Gym Owner authorization.
- **Routing Preservation**: Consumer billing remains at `/v3/billing` and `/pricing`. Future Gym Owner B2B billing will be mounted on a dedicated surface (`/admin/billing`).

---

## Demo Isolation

- User `demo@sweatfix.com` / `role: 'Demo User'` is enforced as a sandbox:
  - Cannot accept staff invitations.
  - Cannot be assigned staff roles.
  - Cannot access organization financial endpoints.
  - Cannot create real Razorpay checkout sessions.

---

## Security Tests

Implemented in `backend/tests/security/phase8b_organization_staff.security.test.ts` (24 automated tests):
1. Owner can access own organization (200 OK)
2. Owner cannot access another organization (403 Forbidden)
3. Manager cannot access another organization (403 Forbidden)
4. Member cannot access owner endpoints (403 Forbidden)
5. Front Desk cannot access financial analytics (403 Forbidden)
6. Trainer cannot access financial analytics (403 Forbidden)
7. Member cannot access financial analytics (403 Forbidden)
8. Organization Owner can access allowed financial endpoint (200 OK)
9. Manager can access allowed financial endpoint (200 OK)
10. Platform Super Admin can access platform analytics (200 OK)
11. Organization role escalation is blocked (cannot assign Platform Super Admin)
12. Member cannot self-promote (403 Forbidden)
13. Invitation cannot cross organizations (token enforces bound organization)
14. Expired invitation is rejected (Validation error)
15. Used invitation is rejected (Validation error)
16. Arbitrary target user attendance check-in is rejected if user not in org (403 Forbidden)
17. Staff can check in eligible member in same organization (200 OK)
18. Member cannot check in another member (403 Forbidden)
19. Demo user cannot become staff (403 Forbidden)
20. Global admin metrics are not exposed to ordinary users (403 Forbidden)
21. AdminRepository scopes queries to organizationId; rejects unscoped global queries for tenant roles
22. Migration 8B replaces current_setting mechanism with canonical auth.uid() & is_org_member()
23. x-organization-id spoofing remains blocked (403 Forbidden)
24. Consumer billing remains isolated from Gym Owner authorization (403 Forbidden)

---

## Migration Changes

Additive migration file: `backend/supabase/migrations/phase_8b_organization_staff_foundation.sql`
- Adds `owner_id` column to `public.organizations` with FK to `auth.users(id)` and index.
- Creates canonical table `public.organization_members` with composite unique constraint `(organization_id, user_id)`.
- Idempotently migrates legacy `public.organization_staff` into `public.organization_members`.
- Adds `location_id` and `invited_by` columns to `public.organization_invitations`.
- Drops obsolete `current_setting` RLS policies on all organization tables.
- Creates canonical fail-closed RLS policies utilizing `public.is_org_member()` and `auth.uid()`.

---

## Files Created

- `backend/supabase/migrations/phase_8b_organization_staff_foundation.sql`
- `backend/src/modules/attendance/attendance.types.ts`
- `backend/src/modules/attendance/attendance.repository.ts`
- `backend/src/modules/attendance/attendance.service.ts`
- `backend/src/modules/attendance/attendance.controller.ts`
- `backend/src/modules/attendance/attendance.routes.ts`
- `backend/src/modules/attendance/index.ts`
- `backend/tests/security/phase8b_organization_staff.security.test.ts`
- `docs/STRIVA_V2_PHASE_8B_ORGANIZATION_STAFF_FOUNDATION.md`

---

## Files Modified

- `backend/src/app/app.ts` (mounted attendance router)
- `backend/src/middleware/tenant.middleware.ts` (demo user staff guard)
- `backend/src/middleware/rbac.middleware.ts` (canonicalized Gym Owner to Organization Owner)
- `backend/src/modules/organization/organization.types.ts` (added owner_id, OrganizationMember, DTOs)
- `backend/src/modules/organization/organization.repository.ts` (members, staff, invitations, locations queries)
- `backend/src/modules/organization/organization.service.ts` (invitation flow, role escalation prevention)
- `backend/src/modules/organization/organization.controller.ts` (staff & invitation controller actions)
- `backend/src/modules/organization/organization.routes.ts` (invitation, staff, role endpoints with RBAC)
- `backend/src/modules/admin/repositories/AdminRepository.ts` (tenant-scoped stats & member queries)
- `backend/src/modules/admin/services/AdminService.ts` (tenant-scoped service methods)
- `backend/src/modules/admin/controllers/AdminController.ts` (enforced tenant context for non-superadmins)
- `backend/src/modules/admin/routes.ts` (tenant middleware)
- `backend/src/modules/billing/routes.ts` (allowed Organization Owner on admin metrics)
- `backend/src/modules/analytics/analytics.routes.ts` (revenue RBAC guards, attendance delegation)
- `backend/tests/security/monetization_lifecycle.security.test.ts` (stabilized mock timestamp jitter)

---

## Files Deleted

None.

---

## Known Limitations

- **No Gym Owner Frontend UI**: Frontend screens for Gym Dashboard, Member Rosters, Attendance Scanning, Staff Management, and Owner Billing remain deliberately unimplemented until Phase 8C+.
- **Mock DB in Automated Tests**: Automated tests run against Vitest mocked database layers; live PostgreSQL RLS verification must be confirmed against a real Supabase database upon deployment.
- **Hardware Integrations**: QR scanners, turnstiles, and RFID attendance hardware remain future roadmap items.

---

## Phase 8C Recommendation

Phase 8C should proceed with building the **Gym Owner Shell & Overview Dashboard**:
1. Implement canonical Gym Owner layout under `src/features/owner/` reusing `src/design-system/`.
2. Connect owner overview cards to `/api/v1/organizations/current`, `/api/v1/analytics/kpis`, and `/api/v1/admin/dashboard-data`.
3. Provide safe navigation without route collisions with consumer `/v3/billing`.
