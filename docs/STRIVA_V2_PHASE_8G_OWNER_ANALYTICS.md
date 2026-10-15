# STRIVA V2 — PHASE 8G: GYM OWNER ANALYTICS

## 1. OBJECTIVE
Implement the canonical STRIVA V2 Gym Owner Analytics & Operational Intelligence system. Enables gym operators (`Organization Owner`, `Gym Manager`, `Platform Super Admin`) to inspect member growth and acquisition, attendance behavior, facility peak periods, trainer caseloads, operational trends, and period-over-period comparisons under strict multi-tenant isolation with zero mock data and zero fabricated percentages.

---

## 2. EXISTING ANALYTICS ENGINE AUDIT
Phase 8A identified legacy analytics logic in [`backend/src/modules/analytics/AnalyticsEngines.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/src/modules/analytics/AnalyticsEngines.ts):
- **MRR & Revenue**: Legacy `RevenueAnalyticsEngine` computed platform revenue based on consumer B2C membership tiers (`pro: ₹1500`, `elite: ₹3900`). Gym owner financial analytics does NOT yet have a canonical B2B source. Exposing consumer fees as gym revenue was strictly prevented.
- **Attendance**: Reused and hardened canonical check-in aggregation. Eliminated phantom derivation from workout sessions for gym facilities.
- **Retention**: Replaced ambiguous formulas with a mathematically deterministic 30-day returning attendee rate and active membership ratio.
- **Isolation**: Legacy engines remain intact for internal platform administration tests, while canonical gym owner analytics is encapsulated inside [`backend/src/modules/analytics/ownerAnalytics.service.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/src/modules/analytics/ownerAnalytics.service.ts).

---

## 3. CANONICAL METRICS & DATA SOURCES

| Category | Metric | Definition | Data Source | Authorization |
| :--- | :--- | :--- | :--- | :--- |
| **Members** | Total Members | All registered members in the organization (`role = 'Member'`) | `organization_members` | Owner, Manager, Super Admin |
| **Members** | Active Members | Members with active status and valid subscription | `organization_members` + `subscriptions` | Owner, Manager, Super Admin |
| **Members** | New Members | Members who joined within the bounded time window | `organization_members(created_at)` | Owner, Manager, Super Admin |
| **Members** | Trial Members | Members currently in trial period (`trialing` or future `trial_ends_at`) | `subscriptions` | Owner, Manager, Super Admin |
| **Members** | Inactive Members | Members suspended or with canceled subscription | `organization_members` + `subscriptions` | Owner, Manager, Super Admin |
| **Attendance** | Total Visits | Check-in records within bounded time window | `attendance_logs(check_in_time)` | Owner, Manager, Super Admin |
| **Attendance** | Unique Attendees | Count of distinct members who visited | `attendance_logs(user_id)` | Owner, Manager, Super Admin |
| **Attendance** | Avg Daily Visits | Total visits divided by days in window | Server calculated | Owner, Manager, Super Admin |
| **Attendance** | Peak Traffic Hour | Hour with highest check-in frequency (00:00 to 23:00) | `attendance_logs(check_in_time)` | Owner, Manager, Super Admin |
| **Attendance** | Peak Traffic Day | Day of week with highest check-in frequency | `attendance_logs(check_in_time)` | Owner, Manager, Super Admin |
| **Attendance** | Avg Visit Duration | Mean duration in minutes from completed check-outs | `attendance_logs(duration_minutes)` | Owner, Manager, Super Admin |
| **Trainers** | Active Coaches | Staff with role 'Trainer' | `organization_members` | Owner, Manager, Super Admin |
| **Trainers** | Assigned Members | Distinct members with active trainer assignment | `trainer_member_assignments(status='active')` | Owner, Manager, Super Admin |
| **Trainers** | Members / Coach | Assigned members divided by active coaches | Server calculated | Owner, Manager, Super Admin |
| **Trainers** | Roster Caseload | Active clients allocated per trainer | `trainer_member_assignments` + `profiles` | Owner, Manager, Super Admin |
| **Retention** | 30-Day Attendee Return Rate | Percentage of unique attendees from the prior window who returned in the current window | `attendance_logs` | Owner, Manager, Super Admin |
| **Retention** | Active Member Ratio | Active members divided by total registered members | `organization_members` | Owner, Manager, Super Admin |

---

## 4. TENANT SCOPE & RBAC
Strict server-side validation is enforced on every endpoint:
- **Tenant Derivation**: Derived server-side from verified Supabase Auth JWT identity and database org membership lookups via `tenantMiddleware`.
- **No Spoofing**: `x-organization-id` header or body parameters requesting an organization that the user does not belong to fail closed (`403 Forbidden`).
- **Role Enforcement**: `requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager'])` is enforced on all owner analytics routes.
- **Unauthorized Roles**: `Member`, `Trainer`, `Front Desk`, `Nutritionist`, `Demo User` are rejected with `403 Forbidden`.

---

## 5. API DESIGN & REST SPECIFICATION
All analytics endpoints are versioned under `/api/v1/analytics/`:

### 1. `GET /api/v1/analytics/overview`
- **Query Params**: `window=7d|30d|90d` (optional `from=YYYY-MM-DD&to=YYYY-MM-DD`)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Unified object containing `members`, `attendance`, `trainers`, `retention`, and deferred `financials` notice.

### 2. `GET /api/v1/analytics/members`
- Returns scoped member acquisition, distribution, and growth comparisons.

### 3. `GET /api/v1/analytics/attendance`
- Returns scoped attendance volume, daily trend series, and hourly floor traffic profile.

### 4. `GET /api/v1/analytics/trainers`
- Returns active coach count, client caseload ratios, and roster caseload breakdown.

### 5. `GET /api/v1/analytics/retention`
- Returns deterministic repeat attendance retention rate and active member ratio.

---

## 6. FINANCIAL ANALYTICS BOUNDARY
In accordance with Phase 8G requirements:
- B2B billing, subscriptions, invoices, and payment collection are strictly excluded.
- STRIVA B2C membership fees (`₹799/mo`, `₹6,999/yr`) remain isolated and are not conflated with gym revenues.
- Legacy USD calculations (`$48,250`) and fake static SVGs are eliminated.
- The API explicitly returns:
  ```json
  {
    "financials": {
      "status": "deferred_phase_8h",
      "note": "Organization financial analytics deferred to Phase 8H. STRIVA B2C membership subscriptions remain isolated."
    }
  }
  ```

---

## 7. TIME WINDOWS & DETERMINISTIC COMPARISONS
- Supported bounded windows: `'7d'`, `'30d'`, `'90d'`.
- All requests are clamped to a maximum 90-day window to prevent unbounded database queries.
- Comparisons calculate change against the immediately preceding equivalent window (e.g. current 30 days vs previous 30 days).
- Deterministic comparison math:
  - When previous period has data (`previous > 0`): `changePct = ((current - previous) / previous) * 100`.
  - When previous period has 0 and current > 0: `status = 'new_baseline'`, message = "New baseline established".
  - When both periods have 0: `status = 'no_data'`, `change = 0`.
  - Growth percentages are NEVER fabricated.

---

## 8. EMPTY STATES & DATA QUALITY
- Cleanly distinguishes `0` (calculated zero) from `No data` (insufficient historical data).
- For new organizations:
  - Members: *"Not enough member history to show a trend."*
  - Attendance: *"No attendance history yet."*
  - Trainers: *"No trainer assignments yet."*
  - Retention: *"Not enough historical data to calculate retention rate."*

---

## 9. FRONTEND IMPLEMENTATION & CHARTS
- **Route**: Canonical `/owner/analytics` route mounted inside `OwnerLayout`.
- **Navigation**: "Analytics" item activated in [`OwnerNav.tsx`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/features/owner/components/OwnerNav.tsx).
- **Legacy Redirects**: `/v3/analytics` and `/admin/analytics` redirect to `/owner/analytics`.
- **Charting Library**: Recharts 3.9 (canonical existing repository library).
  - Member Growth: Recharts `AreaChart` with smooth gradient fill.
  - Attendance Trend: Recharts `AreaChart` for daily check-in volume.
  - Floor Traffic: Recharts `BarChart` for hourly traffic distribution.
- **Zero Mock Data**: UI consumes real data via [`useOwnerAnalytics`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/features/owner/hooks/useOwnerAnalytics.ts) and [`analyticsApi.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/api/analyticsApi.ts).

---

## 10. RESPONSIVE DESIGN & ACCESSIBILITY
- **Responsive Layout**:
  - Desktop (1440px / 1280px / 1024px): Multi-column grid with spacious analytical cards.
  - Mobile (768px / 430px / 390px / 375px): Stacked single-column cards with responsive container heights, horizontal overflow prevention, and readable font sizing.
- **Accessibility**:
  - Semantic heading hierarchy (`<h1>`, `<h2>`, `<h3>`).
  - Text alternatives and accessible summaries for all chart visuals.
  - Keyboard focus states on window selection tabs (`role="tab"`).
  - Contrast compliant colors meeting WCAG 2.1 AA standards.

---

## 11. SECURITY TESTS & REGRESSION
Dedicated security test suite in [`backend/tests/security/phase8g_owner_analytics.security.test.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/tests/security/phase8g_owner_analytics.security.test.ts) covers 21 comprehensive test cases:
1. Owner can access own analytics (200 OK).
2. Manager can access own analytics (200 OK).
3. Member cannot access Owner analytics (403 Forbidden).
4. Trainer cannot access Owner analytics (403 Forbidden).
5. Front Desk cannot access Owner analytics (403 Forbidden).
6. Nutritionist cannot access Owner analytics (403 Forbidden).
7. Demo user cannot access Owner analytics (403 Forbidden).
8. Organization A cannot access Organization B analytics (403 Forbidden).
9. x-organization-id spoofing rejected (403 Forbidden).
10. Analytics queries are strictly organization scoped (no cross-tenant leakage).
11. Global platform counts are not exposed (tenant-specific counts only).
12. Global revenue is not exposed in Owner analytics.
13. Legacy USD revenue cannot leak into Owner analytics.
14. Empty organization returns honest empty state.
15. Analytics time windows are bounded (bounded clamping, invalid format rejection).
16. Previous-period comparisons are mathematically accurate and deterministic.
17. Database/query exception never produces fake analytics.
18. Consumer billing routes remain accessible and unaffected.
19. Member dashboard remains unaffected.
20. Attendance operations remain unaffected.
21. Trainer management remains unaffected.

**Overall Test Suite Result**: 402 / 402 passing across 27 test files (21 new tests, 0 regressions).

---

## 12. BUILDS & COMPILATION
- **Frontend Build**: Vite 6.4.3 production build passed with zero errors (`dist/assets/OwnerAnalyticsPage-DewK6TDc.js`).
- **Backend Build**: TypeScript compilation (`tsc && tsc-alias`) passed with zero errors.

---

## 13. KNOWN LIMITATIONS
- Financial & revenue analytics are deferred to Phase 8H.
- Live DB verification is Static (staging Supabase credentials not connected locally).

---

## 14. FILES INVENTORY
### Files Created:
- `backend/src/modules/analytics/ownerAnalytics.types.ts`
- `backend/src/modules/analytics/ownerAnalytics.service.ts`
- `backend/tests/security/phase8g_owner_analytics.security.test.ts`
- `src/api/analyticsApi.ts`
- `src/features/owner/hooks/useOwnerAnalytics.ts`
- `src/features/owner/components/analytics/AnalyticsTimeWindowSelector.tsx`
- `src/features/owner/components/analytics/MemberAnalyticsCard.tsx`
- `src/features/owner/components/analytics/AttendanceAnalyticsCard.tsx`
- `src/features/owner/components/analytics/TrainerAnalyticsCard.tsx`
- `src/features/owner/components/analytics/RetentionAnalyticsCard.tsx`
- `src/features/owner/components/analytics/DeferredFinancialsNotice.tsx`
- `src/features/owner/pages/OwnerAnalyticsPage.tsx`
- `docs/STRIVA_V2_PHASE_8G_OWNER_ANALYTICS.md`

### Files Modified:
- `backend/src/modules/analytics/index.ts`
- `backend/src/modules/analytics/analytics.routes.ts`
- `src/features/owner/components/OwnerNav.tsx`
- `src/features/owner/index.ts`
- `src/router/index.tsx`

### Files Deleted:
- None.

---

## 15. PHASE 8H RECOMMENDATION
Phase 8H should implement **Gym Owner B2B Billing & Financial Operations**:
1. Canonical B2B subscription model for facility software licenses and add-on modules.
2. Invoicing and payment collection via Razorpay for gym facilities.
3. Organization revenue analytics replacing the Phase 8G deferred status.
4. Granular invoice history, receipts, and tax calculations for gym owners.
