# STRIVA V2 — PHASE 8C: GYM OWNER SHELL & OVERVIEW DASHBOARD SPECIFICATION

## Objective

Phase 8C establishes the first real, production-ready Gym Owner frontend experience for STRIVA V2. Built upon the canonical organization and multi-tenant security foundation delivered in Phase 8B, this phase implements the Gym Owner application shell, responsive navigation, and the Level 1–5 overview dashboard strictly powered by real database queries without mock data.

---

## Owner Route Architecture

The canonical Gym Owner frontend routes are established under the `/owner` namespace:
- `/owner` → Redirects to canonical `/owner/dashboard`.
- `/owner/dashboard` → Main Gym Owner Overview & Telemetry console.
- Legacy fallback: `/admin/*` is mounted to use `<OwnerLayout>` and `<OwnerDashboardPage>`, safely eliminating the legacy mock KPI wall while preserving existing links.
- Consumer isolation: `/v3/billing` remains exclusively consumer STRIVA subscription billing and is strictly decoupled from the Gym Owner workspace.

---

## Owner Shell

The Gym Owner shell is implemented under `src/features/owner/`:
```
src/features/owner/
├── layout/
│   └── OwnerLayout.tsx           # Role guard & layout boundary
├── components/
│   ├── OwnerHeader.tsx           # Organization identity & context selector
│   ├── OwnerNav.tsx              # Phase-aware navigation
│   ├── OwnerStateSection.tsx     # Level 1: State & live telemetry
│   ├── OwnerAttentionSection.tsx # Level 2: Attention items & caught-up state
│   ├── OwnerQuickActions.tsx     # Level 3: Phase-governed quick actions
│   ├── OwnerMetricsSection.tsx   # Level 4: Supporting entities (Locations & Staff)
│   └── OwnerAccessDenied.tsx     # Fail-closed 403 access denied view
├── hooks/
│   ├── useOwnerOverview.ts       # TanStack Query hook for /organizations/current/overview
│   └── useOwnerAccess.ts         # Role verification & demo account guard
├── pages/
│   └── OwnerDashboardPage.tsx    # Primary overview dashboard page
└── index.ts                      # Feature module export barrel
```

---

## Organization Context

- **Dynamic Identity**: The organization name and active branch locations are retrieved directly from the backend via `GET /api/v1/organizations/current/overview`.
- **Multi-Tenant Switching**: If the authenticated user is an owner/manager across multiple organizations, `OwnerHeader` renders an organization selector powered by `GET /api/v1/organizations`.
- **Honest Scoping**: When an organization has multiple locations, the header clearly indicates "Organization-wide telemetry" or primary branch scope rather than implying false per-location filtering.

---

## Dashboard Data Sources

All dashboard telemetry is sourced strictly from canonical, organization-scoped endpoints:
- `GET /api/v1/organizations/current/overview`
  - Enforces `requireAuth`, `tenantMiddleware`, and `requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager'])`.
  - Executes tenant-scoped count queries against `organization_members`, `attendance_logs`, and `organization_locations`.
- Zero mock data: No fake KPI numbers, no hardcoded member counts, no fake revenue estimates, and no artificial trendlines.

---

## State (Level 1)

Answers the central operational question: *"How is my gym doing right now?"*
- **Enrolled Members**: Real count of active registered members in the organization.
- **Today's Attendance**: Real count of check-ins logged today (`attendance_logs.check_in_time >= todayStart`).
- **Currently in Facility**: Real count of active in-progress training sessions (`status = 'active'`).
- **Active Staff Roster**: Real count of managers, trainers, and front desk operators in `organization_members`.

---

## Attention (Level 2)

Surfaces actionable operational items backed by real data:
- Alerts when zero facility locations are configured.
- Alerts when the staff roster is empty.
- Alerts when registered member count is zero.
- **Caught-up State**: If all infrastructure is configured and active, displays: *"You're all caught up. No operational alerts, staff bottlenecks, or facility issues detected right now."*

---

## Actions (Level 3)

Provides purposeful operational shortcuts with strict phase governance:
- **View Staff Roster**: Functional smooth-scroll jump to the Staff Roster card.
- **Facility Locations**: Functional smooth-scroll jump to the Locations card.
- **Member Directory**: Disabled with visible *"Phase 8D"* roadmap badge.
- **Front Desk Terminal**: Disabled with visible *"Phase 8E"* roadmap badge.

---

## Supporting Metrics (Level 4)

Displays compact, real operational rosters:
1. **Facility Locations**: Real branch names, addresses, primary badges, and active statuses.
2. **Staff Roster**: Real team member names, emails, and role badges (`Organization Owner`, `Gym Manager`, `Trainer`, `Front Desk`).

---

## Authorization

- **Allowed Roles**: `Organization Owner`, `Gym Manager`, and `Platform Super Admin`.
- **Denied Roles**: `Member`, `Trainer`, `Nutritionist`, `Front Desk`, and `Demo User` (`demo@sweatfix.com`).
- **Fail-Closed Boundary**: Unauthorized access attempts render `OwnerAccessDenied` with HTTP 403 styling and a one-click return to Member Home (`/v3/dashboard`).

---

## Responsive Behavior

The Gym Owner shell is responsive across all standard breakpoints:
- Desktop (1440px, 1280px): Full horizontal navigation, 4-column metric grid, 2-column supporting entity layout.
- Tablet (1024px, 768px): 2-column metric grid, stacked supporting entity cards.
- Mobile (430px, 390px, 375px): 2-column compact state tiles, stacked layout, zero horizontal overflow, touch-optimized button targets.

---

## Accessibility

- Semantic HTML (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`).
- Heading hierarchy (`<h1>` for organization identity, `<h2>` for section groupings, `<h3>` for cards).
- Proper ARIA attributes (`aria-label`, `aria-labelledby`, `aria-disabled`, `role="menu"`).
- Keyboard-navigable buttons with visible focus rings (`focus-visible:ring-2 focus-visible:ring-orange-500`).
- High-contrast typography on dark backgrounds.

---

## Testing

Phase 8C introduces 12 automated security and integration tests in `backend/tests/security/phase8c_gym_owner_shell.security.test.ts`:
1. Owner can access Owner shell / overview (200 OK)
2. Gym Manager can access Owner shell / overview (200 OK)
3. Member cannot access Owner shell / overview (403 Forbidden)
4. Trainer cannot access Owner shell / overview (403 Forbidden)
5. Front Desk cannot access Owner shell / overview (403 Forbidden)
6. Overview endpoint verifies tenant scope and does not execute unscoped global queries
7. Metrics are dynamically computed from tenant database records (no hardcoded constants)
8. Organization identity is dynamic and matches the database record
9. Spoofed x-organization-id is rejected with 403 Forbidden
10. 403 response contains clean structured error without server stack leaks
11. Empty facility state generates honest attention items without inventing fake data
12. Consumer billing status remains functional and isolated from Gym Owner authorization

**Regression Status**: 320 / 320 tests passing across all 23 test suites.

---

## Known Limitations

- **Phase 8D Member Management**: Deep member tables, roster filters, and member profile drawers are scheduled for Phase 8D.
- **Phase 8E Attendance & Trainer Terminal**: QR check-in scanning, terminal operations, and trainer client assignment are scheduled for Phase 8E.
- **Phase 8F Analytics**: Deep retention curves, cohorts, and financial forecasting are scheduled for Phase 8F.
- **B2B Billing**: Dedicated Gym Owner subscription invoicing will be implemented in a subsequent phase.

---

## Future Owner Features

1. **Phase 8D**: Member Management UI (Member directory, membership status, search, filters).
2. **Phase 8E**: Attendance Terminal & Trainer Workspace (Live turnstile/counter check-in, trainer schedule).
3. **Phase 8F**: Owner Analytics & Financial Reporting (Revenue charts, retention cohorts, churn analytics).
4. **Phase 8G**: B2B TRINETRA Advisory (Executive AI copilot for gym facility insights).

---

## Files Created

- `src/features/owner/layout/OwnerLayout.tsx`
- `src/features/owner/components/OwnerHeader.tsx`
- `src/features/owner/components/OwnerNav.tsx`
- `src/features/owner/components/OwnerStateSection.tsx`
- `src/features/owner/components/OwnerAttentionSection.tsx`
- `src/features/owner/components/OwnerQuickActions.tsx`
- `src/features/owner/components/OwnerMetricsSection.tsx`
- `src/features/owner/components/OwnerAccessDenied.tsx`
- `src/features/owner/hooks/useOwnerOverview.ts`
- `src/features/owner/hooks/useOwnerAccess.ts`
- `src/features/owner/pages/OwnerDashboardPage.tsx`
- `src/features/owner/index.ts`
- `backend/tests/security/phase8c_gym_owner_shell.security.test.ts`
- `docs/STRIVA_V2_PHASE_8C_GYM_OWNER_SHELL.md`

---

## Files Modified

- `backend/src/modules/organization/organization.types.ts` (added `OrganizationOverview` & metrics types)
- `backend/src/modules/organization/organization.repository.ts` (added `getOverview` database query)
- `backend/src/modules/organization/organization.service.ts` (added `getOverview` service method)
- `backend/src/modules/organization/organization.controller.ts` (added `getOrganizationOverview` controller action)
- `backend/src/modules/organization/organization.routes.ts` (mounted `GET /current/overview` route)
- `src/api/organizationApi.ts` (added `getOverview` and `getStaff` API calls)
- `src/context/AuthContext.tsx` (mapped `role` property in `mapSupabaseUser`)
- `src/design-system/icons.ts` (exported `ArrowLeft`)
- `src/design-system/shell/Sidebar.tsx` (updated overview route pointer to `/owner/dashboard`)
- `src/router/index.tsx` (registered `/owner/*` and protected `/admin/*` routes)
- `backend/tests/security/monetization_lifecycle.security.test.ts` (stabilized mock timestamp jitter)

---

## Files Deleted

None.
