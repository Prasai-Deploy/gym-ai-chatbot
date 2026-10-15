# STRIVA V2 — PHASE 8E: GYM OWNER ATTENDANCE OPERATIONS

## 1. OBJECTIVE
Implement the canonical STRIVA V2 Gym Owner Attendance Operations system for front desk operations. Enables authorized facility operators (Organization Owner, Gym Manager, Front Desk, Trainer) to monitor live facility check-in sessions, execute rapid member check-in and check-out workflows, enforce duplicate protection, inspect today's chronological activity, and preserve strict multi-tenant isolation with zero mock data.

---

## 2. ATTENDANCE ARCHITECTURE
The attendance architecture strictly leverages the canonical attendance domain:
- **Repository**: [`backend/src/modules/attendance/attendance.repository.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/src/modules/attendance/attendance.repository.ts)
  - `createCheckIn(record)`: Inserts active attendance session.
  - `findActiveCheckIn(orgId, userId)`: Finds currently open check-in.
  - `findById(orgId, attendanceId)`: Fetches attendance log scoped to tenant.
  - `checkOut(attendanceId, checkOutTime, durationMinutes)`: Marks session completed with timestamp and calculated duration.
  - `getTodayOverview(orgId)`: Aggregates today's check-ins, currently inside active sessions, and recent chronological events joined with user profiles.
  - `searchMembers(orgId, query, limit)`: Fast front-desk member lookup scoped strictly to tenant.
  - `getOrganizationHistory(orgId, limit)`: Organization-scoped attendance activity stream.
- **Service**: [`backend/src/modules/attendance/attendance.service.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/src/modules/attendance/attendance.service.ts)
  - Enforces role authorization and self vs staff check-in semantics.
  - Validates organization membership (`isUserInOrg`).
  - Enforces 12-hour duplicate check-in protection, raising `ConflictError` (HTTP 409).
  - Enforces session ownership upon checkout (Members can only check out self; staff can check out any session in their org).
- **Controller & Router**:
  - Mounted at `/api/v1/attendance` in Express app.
  - Endpoints:
    - `POST /api/v1/attendance/checkin`
    - `POST /api/v1/attendance/checkout`
    - `GET /api/v1/attendance/today`
    - `GET /api/v1/attendance/history`
    - `GET /api/v1/attendance/members/search`

---

## 3. ROUTES & URL TAXONOMY
- **Canonical Owner UI Route**: `/owner/attendance`
- **Legacy Redirects**:
  - `/v3/attendance` ➔ `/owner/attendance`
  - `/admin/attendance` ➔ `/owner/attendance`
- **Frontend App Router**: Mounted within `ProtectedRoute` and `OwnerLayout` in [`src/router/index.tsx`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/router/index.tsx).

---

## 4. AUTHORIZATION MATRIX
Role-based authorization enforced authoritatively on backend:

| Role | View Today Overview | Check In Self | Check In Other Member | Check Out Self | Check Out Other Member | Attendance History |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Platform Super Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Tenant-wide) |
| **Organization Owner** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Tenant-wide) |
| **Gym Manager** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Tenant-wide) |
| **Front Desk** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Tenant-wide) |
| **Trainer** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Tenant-wide) |
| **Member** | ❌ (403) | ✅ | ❌ (403) | ✅ | ❌ (403) | ✅ (Self only) |
| **Nutritionist** | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| **Demo User** | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |

---

## 5. CHECK-IN FLOW & DUPLICATE PROTECTION
1. Front desk types member name or email in search box (`/api/v1/attendance/members/search`).
2. Staff selects candidate member, rendering confirmation tile.
3. Front desk clicks "Confirm Check-In" (`POST /api/v1/attendance/checkin`).
4. Server validates caller tenant membership, target user membership, and checks active sessions.
5. If an active session exists within the 12-hour window, server raises `ConflictError` (HTTP 409: *"Member already has an active check-in session from HH:MM"*).
6. On success (201 Created), TanStack Query invalidates `['owner', 'attendance', 'today']` and activity streams, instantly updating "Currently Inside" count and lists.

---

## 6. CHECK-OUT FLOW
1. Front desk inspects "Currently Inside Facility" live feed.
2. Staff clicks "Check Out" on the active session row.
3. Server verifies caller organization context, validates attendance session belongs to tenant, calculates elapsed visit duration (`duration_minutes`), and updates record status to `completed` with `check_out_time`.
4. Subsequent check-outs of completed sessions fail closed (400 Bad Request). Cross-tenant session checkouts fail closed (404 Not Found).

---

## 7. SEARCH & HISTORY ARCHITECTURE
- **Search**: Dedicated `/attendance/members/search` query endpoint scoped to caller's verified organization. Returns only minimal member profile descriptors (`id`, `userId`, `name`, `email`, `status`) to keep payload under 2KB and prevent heavy member dumps.
- **Today's Activity Feed**: Compact chronological audit log of today's check-ins and check-outs, reporting start time, exit time, elapsed minutes, and location name.

---

## 8. LOCATION SCOPE
- If an organization has multiple locations, `location_id` is captured on check-in and resolved via Supabase foreign key join `organization_locations(name)`.
- If no location is assigned or organization has a single facility, location defaults to null gracefully without fake counters or simulated multi-branch isolation.

---

## 9. HARDWARE INTEGRATION NOTICE
In accordance with Phase 8E requirements, no hardware assumptions, RFID readers, QR scanner devices, turnstiles, or biometrics were created. The architecture is 100% software-driven at the front desk interface.

---

## 10. ERROR HANDLING & ZERO MOCK DATA
- Strictly no mock data fallbacks in `attendanceApi.ts`, `httpClient.ts`, or UI components.
- Errors cleanly surface in `role="alert"` toasts and feedback badges.
- When there is no attendance today, UI displays: *"No attendance recorded today."*

---

## 11. RESPONSIVE DESIGN & ACCESSIBILITY
- Verified across responsive breakpoints: 1440px, 1280px, 1024px, 768px, 430px, 390px, 375px.
- Minimal dark-first design consistent with STRIVA design system.
- Full screen-reader support: `<label htmlFor="member-search-input" className="sr-only">`, `aria-labelledby`, accessible buttons with loading states (`Loader2`), non-color-dependent status badges.

---

## 12. SECURITY TESTS & VERIFICATION
The complete security test suite [`backend/tests/security/phase8e_attendance_operations.security.test.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/tests/security/phase8e_attendance_operations.security.test.ts) passes all 20 required scenarios:
1. Owner can view attendance overview.
2. Manager can view attendance overview.
3. Front Desk can perform allowed check-in.
4. Trainer can perform allowed attendance actions.
5. Member cannot access owner attendance terminal.
6. Nutritionist cannot access owner attendance terminal.
7. Demo user cannot access owner attendance terminal.
8. Cross-tenant check-in rejected.
9. Spoofed `x-organization-id` rejected.
10. Arbitrary target user rejected when Member attempts check-in.
11. Member must belong to organization.
12. Duplicate active check-in rejected with 409 Conflict.
13. Valid check-in succeeds.
14. Valid checkout succeeds.
15. Checkout of another organization's session rejected.
16. Checkout of nonexistent active session rejected.
17. Attendance history is organization scoped.
18. Search is organization scoped.
19. Missing `attendanceId` during checkout rejected without fallback.
20. Consumer billing remains unaffected by attendance operations.

**Total Test Suite Result**: 359 / 359 tests passing across 25 suites (0 regressions).

---

## 13. BUILDS & COMPILATION
- **Frontend Build**: `npm run build:frontend` (Vite 6.4.3) passed in 5.30s.
- **Backend Build**: `npm run build:backend` (`tsc && tsc-alias`) passed with zero errors.

---

## 14. KNOWN LIMITATIONS
- Hardware turnstiles, biometric scanners, and QR auto-check-in kiosks are not included (software front-desk workflow only, as specified).
- Trainer workspace scheduling and member workout assignment remain scheduled for subsequent phases.

---

## 15. FILES INVENTORY
### Files Created:
- `src/api/attendanceApi.ts`
- `src/features/owner/hooks/useOwnerAttendance.ts`
- `src/features/owner/components/AttendanceCheckInSearch.tsx`
- `src/features/owner/components/ActiveMembersList.tsx`
- `src/features/owner/components/AttendanceActivityFeed.tsx`
- `src/features/owner/pages/OwnerAttendancePage.tsx`
- `backend/tests/security/phase8e_attendance_operations.security.test.ts`
- `docs/STRIVA_V2_PHASE_8E_ATTENDANCE_OPERATIONS.md`

### Files Modified:
- `backend/src/errors/AppError.ts`
- `backend/src/modules/attendance/attendance.types.ts`
- `backend/src/modules/attendance/attendance.repository.ts`
- `backend/src/modules/attendance/attendance.service.ts`
- `backend/src/modules/attendance/attendance.controller.ts`
- `backend/src/modules/attendance/attendance.routes.ts`
- `src/features/owner/hooks/useOwnerAccess.ts`
- `src/features/owner/components/OwnerNav.tsx`
- `src/features/owner/components/OwnerQuickActions.tsx`
- `src/features/owner/index.ts`
- `src/router/index.tsx`

### Files Deleted:
- None

---

## 16. PHASE 8F RECOMMENDATION
Proceed to **Phase 8F — Trainer Management & Assignments**:
- Gym owner trainer roster, trainer profiles, capacity tracking.
- Client assignment between members and trainers.
- Trainer workspace foundations respecting tenant boundaries.
