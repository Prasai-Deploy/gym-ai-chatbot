# STRIVA V2 — PHASE 8D: GYM OWNER MEMBER MANAGEMENT FOUNDATION SPECIFICATION

## Objective

Phase 8D establishes the first real, production-ready Gym Owner Member Management experience for STRIVA V2. Built strictly upon the canonical database foundation established in Phase 8B and the application shell delivered in Phase 8C, this phase provides Gym Owners and Managers with an authoritative member directory, server-side search, pagination, status filtering, and an authorized member profile detail view, strictly powered by real database records without mock data.

---

## Route Architecture

The canonical Member Management interface is mounted under the Gym Owner OS route namespace:
- Canonical Route: `/owner/members`
- Route Guard: `ProtectedRoute` -> `<OwnerLayout>` (enforces `Organization Owner`, `Gym Manager`, or `Platform Super Admin`)
- Legacy Redirects:
  - `/v3/members` → Redirects to canonical `/owner/members`
  - `/admin/members` → Redirects to canonical `/owner/members`
- Shell Integration:
  - `OwnerNav`: "Members" tab is active and linked directly to `/owner/members`.
  - `OwnerQuickActions`: "Member Directory" quick action button routes to `/owner/members`.
  - `Sidebar`: Navigation item points directly to canonical `/owner/members`.

---

## API Layer

The member management endpoints are mounted in `backend/src/modules/organization/organization.routes.ts`:

### 1. Paginated Member Directory
- **Path**: `GET /api/v1/organizations/current/members` (and `GET /api/v1/organizations/:id/members`)
- **Protections**:
  - `requireAuth`: Enforces valid Supabase Auth JWT.
  - `tenantMiddleware`: Resolves caller tenant server-side; fails closed on spoofed `x-organization-id` (403 Forbidden).
  - `requireRoles`: Restricted strictly to `['Platform Super Admin', 'Organization Owner', 'Gym Manager']`.
  - Organization Boundary: For `/:id/members`, caller must either be `Platform Super Admin` or `:id` must match `req.organizationContext.organizationId`.
- **Query Parameters**:
  - `page`: 1-based page index (default: 1)
  - `limit`: Items per page (default: 10, max: 100)
  - `search`: Case-insensitive search on member `full_name` or `email`
  - `status`: Supported filter: `'all' | 'active' | 'trial' | 'inactive'`
  - `role`: Optional filter: `'all' | 'Member' | 'Trainer' | 'Gym Manager' | 'Front Desk'`
- **Response Format**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "mem-uuid",
        "userId": "usr-uuid",
        "name": "Alex Rivera",
        "email": "alex@example.com",
        "avatarUrl": "https://cdn.example.com/alex.jpg",
        "role": "Member",
        "status": "active",
        "membershipTier": "pro",
        "isTrial": false,
        "trialEndsAt": null,
        "joinedAt": "2026-01-15T08:00:00.000Z",
        "lastActivityAt": "2026-03-01T14:30:00.000Z",
        "locationId": "loc-uuid",
        "locationName": "Downtown Branch"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
  ```

### 2. Member Detail View
- **Path**: `GET /api/v1/organizations/current/members/:memberId` (and `GET /api/v1/organizations/:id/members/:memberId`)
- **Protections**:
  - Same auth and role guards as directory.
  - Lookups support both membership UUID (`organization_members.id`) and user UUID (`organization_members.user_id`).
  - Scoped strictly to `organization_id = tenantOrgId`.
- **Response Format**:
  ```json
  {
    "success": true,
    "data": {
      "id": "mem-uuid",
      "userId": "usr-uuid",
      "organizationId": "org-uuid",
      "name": "Alex Rivera",
      "email": "alex@example.com",
      "avatarUrl": null,
      "timezone": "America/New_York",
      "role": "Member",
      "status": "active",
      "joinedAt": "2026-01-15T08:00:00.000Z",
      "locationId": "loc-uuid",
      "locationName": "Downtown Branch",
      "membership": {
        "status": "active",
        "tier": "pro",
        "isTrial": false,
        "trialStartedAt": null,
        "trialEndsAt": null,
        "currentPeriodEnd": "2026-04-01T00:00:00.000Z"
      },
      "fitnessSummary": {
        "level": "intermediate",
        "primaryGoal": "Strength & Hypertrophy"
      },
      "activitySummary": {
        "lastCheckInAt": "2026-03-01T14:30:00.000Z",
        "totalCheckIns": 14
      }
    }
  }
  ```

---

## Authorization & Role Boundary

| Caller Role | Member Directory Access | Detail View Access | Enforcement Mechanism |
| :--- | :---: | :---: | :--- |
| **Platform Super Admin** | **Allowed** | **Allowed** | System-level admin override |
| **Organization Owner** | **Allowed** (Own Org) | **Allowed** (Own Org) | `requireRoles` + tenantMiddleware |
| **Gym Manager** | **Allowed** (Own Org) | **Allowed** (Own Org) | `requireRoles` + tenantMiddleware |
| **Trainer** | **Blocked (403)** | **Blocked (403)** | Backend RBAC middleware |
| **Front Desk** | **Blocked (403)** | **Blocked (403)** | Backend RBAC middleware |
| **Nutritionist** | **Blocked (403)** | **Blocked (403)** | Backend RBAC middleware |
| **Member** | **Blocked (403)** | **Blocked (403)** | Backend RBAC middleware |
| **Demo User** | **Blocked (403)** | **Blocked (403)** | Backend tenant middleware sandbox guard |

---

## Canonical Member Data Model

STRIVA V2 strictly uses the canonical hierarchy established in Phase 8B:
```
public.organizations
         ↓ (1:N)
public.organization_members (Authority: id, organization_id, user_id, role, status, created_at)
         ↓ (1:1)
public.profiles (Identity: full_name, email, avatar_url, timezone)
         ↓ (1:1)
public.subscriptions (State: tier, status, trial_started_at, trial_ends_at, current_period_end)
```
- No duplicate tables (`gym_members`, `owner_members`, `member_directory`, etc.) were created.
- PostgreSQL Migration `phase_8d_member_management.sql` establishes performance indexes and ensures foreign key alignment.

---

## Search & Filtering

1. **Search**:
   - Queries `profiles` table using case-insensitive parameterized queries (`full_name.ilike.%search%` OR `email.ilike.%search%`).
   - Results are intersected with `organization_members` for the caller's organization.
   - Cross-organization leakage is structurally impossible.
2. **Filters**:
   - Status: `'all'`, `'active'`, `'trial'`, `'inactive'`.
   - Real data backing: Status is mapped directly from canonical `subscriptions` and `organization_members.status`. No statuses are fabricated or guessed from UI state.
   - Role: `'all'`, `'Member'`, `'Trainer'`, `'Gym Manager'`, `'Front Desk'`.

---

## Pagination Strategy

- Server-side pagination using `page` and `limit`.
- Stable ordering: `created_at DESC`, `id ASC` ensures zero duplicate records across pages.
- Returns comprehensive pagination metadata: `{ total, page, limit, totalPages }`.
- Prevents loading thousands of records into browser memory.

---

## Member Privacy & Security Boundaries

Gym Owner and Manager access is strictly subject to privacy constraints:
1. **Never Exposed**:
   - Password hashes, password salts, auth tokens, or session secrets.
   - Stripe/Razorpay API secrets, payment credentials, or payment signatures.
   - TRINETRA AI internal memory (`ai_memory`, `ai_agent_memories`, `ai_messages`, `ai_tool_executions`).
   - Private medical conditions and confidential health records.
2. **Authorized Disclosures**:
   - Name, email, avatar, timezone.
   - Organization role, joined date, assigned branch.
   - Membership tier, subscription status, trial expiry.
   - High-level fitness summary (experience level, primary goal).
   - Facility check-in timestamps and visit totals.

---

## Empty, Error, and Loading States

1. **Empty States**:
   - If search query yields zero matches: *"No Matching Members — No members match your current query. Try adjusting your filters."* with a "Clear Filters" action.
   - If organization has zero members: *"No Members Yet — Your facility roster is currently empty."*
   - Absolutely zero mock members are rendered (no Marcus Vance, Sarah Jenkins, etc.).
2. **Error States**:
   - Catches 401, 403, 404, or network failures cleanly.
   - Renders a styled alert card with a "Retry Request" button.
   - Never falls back to mock data arrays.
3. **Loading States**:
   - Uses `LoadingSkeleton` from `src/design-system/components/LoadingSkeleton.tsx` for cards and rows.
   - Zero layout jumping.

---

## Responsive & Mobile Behavior

The directory provides tailored experiences across all screen sizes:
- **Desktop (1440px, 1280px, 1024px)**: Full operational table layout with member avatar, name, email, role badge, status badge, trial indicators, join date, last visit, and inspect button.
- **Tablet & Mobile (768px, 430px, 390px, 375px)**: Automatically switches to touch-optimized card rows. Eliminates horizontal scrolling while keeping member avatar, name, email, role, status badges, trial countdowns, and inspect actions readable.

---

## Accessibility (A11y)

- Semantic `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` for desktop tabular views.
- Fully labeled search input with `<label htmlFor="member-search" className="sr-only">`.
- Focusable interactive elements with high-visibility focus rings (`focus:ring-1 focus:ring-orange-500/50`).
- Status communicated via both color-coded badges and clear textual labels (Active, Trial, Inactive).
- Drawer supports Escape key, backdrop click, body scroll locking, and accessible close button.

---

## Testing & Security Verification

Phase 8D introduces 19 automated security and integration tests in `backend/tests/security/phase8d_member_management.security.test.ts`:
1. TEST 1: Organization Owner can access `/api/v1/organizations/current/members` (200 OK).
2. TEST 2: Gym Manager can access `/api/v1/organizations/current/members` (200 OK).
3. TEST 3: Member cannot access Owner member directory (403 Forbidden).
4. TEST 4: Trainer cannot access Owner member directory (403 Forbidden).
5. TEST 5: Front Desk cannot access Owner member directory (403 Forbidden).
6. TEST 6: Nutritionist cannot access Owner member directory (403 Forbidden).
7. TEST 7: Demo User cannot access Owner member directory (403 Forbidden).
8. TEST 8: Organization A cannot retrieve Organization B members (403 Forbidden).
9. TEST 9: Spoofed `x-organization-id` cannot bypass tenant middleware (403 Forbidden).
10. TEST 10: Missing/invalid token fails closed (401 Unauthorized).
11. TEST 11: Member search returns matched members within the organization (200 OK).
12. TEST 11b: Non-matching search returns 0 items honestly.
13. TEST 12: Pagination parameters limit results and provide accurate metadata.
14. TEST 13: Owner can view member details for a member within the organization.
15. TEST 14: Member detail does NOT leak passwords, tokens, AI memory, or billing secrets.
16. TEST 15: Organization with zero members returns honest empty state without fake mock members.
17. TEST 16: DB failure returns structured error and never silently falls back to mock data.
18. TEST 17: Consumer billing status endpoint remains functional and isolated.
19. TEST 18: Existing Phase 8C overview dashboard endpoint remains fully functional.

**Regression Status**: 339 / 339 tests passing across all 24 test suites.

---

## Files Created

- `backend/supabase/migrations/phase_8d_member_management.sql`
- `backend/tests/security/phase8d_member_management.security.test.ts`
- `src/features/owner/hooks/useOwnerMembers.ts`
- `src/features/owner/components/OwnerMemberFilters.tsx`
- `src/features/owner/components/OwnerMemberPagination.tsx`
- `src/features/owner/components/OwnerMemberTable.tsx`
- `src/features/owner/components/OwnerMemberDetailDrawer.tsx`
- `src/features/owner/pages/OwnerMembersPage.tsx`
- `docs/STRIVA_V2_PHASE_8D_MEMBER_MANAGEMENT.md`

## Files Modified

- `backend/src/modules/organization/organization.types.ts` (added MemberQueryOptions, MemberListItem, MemberDetailView, PaginatedMembersResult)
- `backend/src/modules/organization/organization.repository.ts` (added `getPaginatedMembers` and `getMemberDetails` methods)
- `backend/src/modules/organization/organization.service.ts` (added `getPaginatedMembers` and `getMemberDetails` methods)
- `backend/src/modules/organization/organization.controller.ts` (updated `getOrganizationMembers`, added `getOrganizationMemberDetail`)
- `backend/src/modules/organization/organization.routes.ts` (mounted `/current/members`, `/current/members/:memberId`, `/:id/members`, `/:id/members/:memberId` with RBAC)
- `src/api/organizationApi.ts` (added `getCurrentMembers`, `getMemberDetail`, updated `getOrganizationMembers`)
- `src/features/owner/components/OwnerNav.tsx` (activated Members tab)
- `src/features/owner/components/OwnerQuickActions.tsx` (activated Member Directory button)
- `src/features/owner/index.ts` (exported new Phase 8D components and hooks)
- `src/design-system/shell/Sidebar.tsx` (pointed businessRoutes members link to `/owner/members`)
- `src/router/index.tsx` (registered `/owner/members` route, added legacy redirects)

## Files Deleted

None.

---

## Known Limitations

- Full member editing, membership cancellations, and plan reassignment are deferred to later phases.
- Front Desk QR scanning and check-in terminal operations belong to Phase 8E.
- Trainer workspace and client assignment belong to Phase 8E.
- B2B Gym Owner subscription billing belongs to Phase 8H.

---

## Phase 8E Recommendation

Phase 8E should proceed with implementing the **Gym Owner Attendance Terminal & Trainer Workspace Foundation**:
1. Build the fast front-desk attendance turnstile/counter check-in interface under `/owner/attendance`.
2. Connect to canonical `backend/src/modules/attendance/` service.
3. Build the trainer roster and client assignment view under `/owner/trainers`.
