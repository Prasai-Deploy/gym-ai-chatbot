# STRIVA V2 — PHASE 8F: GYM OWNER TRAINER MANAGEMENT & MEMBER ASSIGNMENTS

## 1. OBJECTIVE
Implement the canonical STRIVA V2 Gym Owner Trainer Management and Member Assignment system. Enables gym operators (`Organization Owner`, `Gym Manager`, `Platform Super Admin`) to inspect their authorized trainer roster, search trainers, inspect trainer detail cards, review active client caseloads, assign eligible members to trainers, and reassign or remove member assignments under strict multi-tenant isolation with zero mock data.

---

## 2. CANONICAL TRAINER IDENTITY
Trainer identity is canonical and non-duplicated:
- Derived strictly from `organization_members` where `role = 'Trainer'`.
- Does not create or use secondary `trainers` or `gym_trainers` tables.
- Profile information (`full_name`, `email`, `avatar_url`) is joined directly from `public.profiles`.

---

## 3. CANONICAL ASSIGNMENT MODEL
Additive schema migration in [`backend/supabase/migrations/phase_8f_trainer_assignments.sql`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/supabase/migrations/phase_8f_trainer_assignments.sql):
- **Table**: `public.trainer_member_assignments`
- **Fields**:
  - `id`: UUID (Primary Key)
  - `organization_id`: UUID (Foreign Key to `organizations(id)`)
  - `trainer_user_id`: UUID (Foreign Key to `profiles(id)`)
  - `member_user_id`: UUID (Foreign Key to `profiles(id)`)
  - `status`: `'active' | 'inactive' | 'paused'`
  - `assigned_at`: TIMESTAMPTZ
  - `created_at`: TIMESTAMPTZ
  - `updated_at`: TIMESTAMPTZ
- **Constraint**: Unique partial index `idx_unique_active_member_trainer_assignment` on `(organization_id, member_user_id)` where `status = 'active'`. A member may have at most one primary active trainer in an organization at any time.

---

## 4. ASSIGNMENT TENANT MODEL & AUTHORIZATION
Authorization is authoritatively enforced server-side:
- **Tenant Scoping**: All queries and mutations strictly verify `req.organizationContext.organizationId`.
- **Role Restrictions**:
  - `Organization Owner`, `Gym Manager`, `Platform Super Admin`: Can view trainer roster, inspect any trainer's details, assign members, and remove assignments.
  - `Trainer`: Can view trainer roster and view their own assigned members (`callerUserId === trainerUserId`). Attempting to inspect other trainers' details or manage assignments is rejected with `403 Forbidden`.
  - `Front Desk`, `Member`, `Nutritionist`, `Demo User`: Blocked from viewing trainer roster or managing assignments (`403 Forbidden`).
- **Validation**:
  - Trainer must be verified in `organization_members` with `role = 'Trainer'`.
  - Member must be verified in `organization_members` with `role = 'Member'`.
  - Self-assignment (a member assigning themselves as their own trainer) is rejected (`400 Bad Request`).
  - Cross-tenant lookups and assignments fail closed (`403 Forbidden` / `404 Not Found`).

---

## 5. TRAINER ROSTER & DETAILS
- **Roster Endpoint**: `GET /api/v1/trainers?search=`
  - Returns real trainers from `organization_members` with active assigned member count.
  - Zero mock data.
- **Detail Endpoint**: `GET /api/v1/trainers/:trainerUserId`
  - Returns trainer metadata and the list of actively assigned members (`assignmentId`, `memberUserId`, `name`, `email`, `assignedAt`).
  - Excludes sensitive credentials (passwords, payment tokens, internal AI memory).

---

## 6. MEMBER ASSIGNMENT & REASSIGNMENT WORKFLOW
- **Assignment Endpoint**: `POST /api/v1/trainers/assignments`
  - Body: `{ trainerUserId, memberUserId }`
  - If member already has an active assignment to the same trainer: `ConflictError` (`409 Conflict`).
  - If member has an active assignment to another trainer in the organization: Old assignment is automatically transitioned to `status = 'inactive'`, and new assignment is created (Reassignment flow).
- **Remove Endpoint**: `DELETE /api/v1/trainers/assignments/:assignmentId`
  - Transitions assignment to `status = 'inactive'` with timestamp.

---

## 7. CAPACITY & STATUS
- Displays real assigned member counts computed directly from active assignments.
- No arbitrary hardcoded "maximum 20 clients" capacity caps are invented.
- Status reflects database state (`active` / `inactive`).

---

## 8. FRONTEND ARCHITECTURE & ROUTES
- **Canonical UI Route**: `/owner/trainers`
- **Legacy Redirects**:
  - `/v3/trainers` ➔ `/owner/trainers`
  - `/admin/trainers` ➔ `/owner/trainers`
- **UI Components**:
  - [`OwnerTrainersPage.tsx`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/features/owner/pages/OwnerTrainersPage.tsx): Main roster page with search and quick actions.
  - [`TrainerDetailDrawer.tsx`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/features/owner/components/TrainerDetailDrawer.tsx): Sliding panel displaying assigned members and unassign button.
  - [`AssignMemberModal.tsx`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/features/owner/components/AssignMemberModal.tsx): Modal to search organization members and confirm assignment.
- **Shell Integration**:
  - Activated "Trainers" tab in [`OwnerNav.tsx`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/features/owner/components/OwnerNav.tsx).

---

## 9. DOMAIN BOUNDARIES
- **Consumer Billing**: Unaffected and strictly isolated.
- **Attendance Operations**: Unaffected and strictly isolated.
- **TRINETRA & AI Assistants**: No AI copilot, B2B tools, or trainer AI memory inspection created.
- **Workouts**: Workout domain logic preserved without unnecessary coupling.

---

## 10. SECURITY TESTS & REGRESSION
The dedicated security test suite [`backend/tests/security/phase8f_trainer_management.security.test.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/tests/security/phase8f_trainer_management.security.test.ts) covers all 22 required test cases:
1. Owner can view trainers.
2. Manager can view trainers.
3. Member cannot access Owner trainer management.
4. Front Desk cannot view trainer roster.
5. Trainer cannot inspect another trainer's details.
6. Trainer can access permitted own assignment data.
7. Demo user cannot access trainer management.
8. Cross-tenant trainer lookup rejected (404).
9. Cross-tenant member lookup rejected during assignment (403).
10. Cross-tenant assignment rejected (403).
11. Unauthorized role assignment rejected (403).
12. Member cannot self-assign as trainer (400).
13. Owner can assign member to trainer (201).
14. Manager can assign member to trainer (201).
15. Duplicate active assignment rejected (409 Conflict).
16. Reassignment is organization scoped.
17. Removing assignment is authorized for Owner (200).
18. Unauthorized user cannot remove assignment (403).
19. No unauthorized sensitive member fields returned.
20. Network failure / nonexistent assignment delete fails cleanly without fallback.
21. Consumer billing remains unaffected by trainer operations.
22. Attendance remains unaffected by trainer operations.

**Overall Test Suite Result**: 381 / 381 passing across 26 test suites (0 regressions).

---

## 11. BUILDS & COMPILATION
- **Frontend Build**: Vite 6.4.3 production build passed in 5.67s.
- **Backend Build**: TypeScript compilation (`tsc && tsc-alias`) passed with zero errors.

---

## 12. KNOWN LIMITATIONS
- Trainer payroll, scheduling calendar, commission tracking, and workout prescription are deliberately excluded as per Phase 8F specification.
- Live DB verification is Static (staging Supabase credentials not connected locally).

---

## 13. FILES INVENTORY
### Files Created:
- `backend/supabase/migrations/phase_8f_trainer_assignments.sql`
- `backend/src/modules/trainer/trainer.types.ts`
- `backend/src/modules/trainer/trainer.repository.ts`
- `backend/src/modules/trainer/trainer.service.ts`
- `backend/src/modules/trainer/trainer.controller.ts`
- `backend/src/modules/trainer/trainer.routes.ts`
- `backend/src/modules/trainer/index.ts`
- `src/api/trainerApi.ts`
- `src/features/owner/hooks/useOwnerTrainers.ts`
- `src/features/owner/components/TrainerDetailDrawer.tsx`
- `src/features/owner/components/AssignMemberModal.tsx`
- `src/features/owner/pages/OwnerTrainersPage.tsx`
- `backend/tests/security/phase8f_trainer_management.security.test.ts`
- `docs/STRIVA_V2_PHASE_8F_TRAINER_MANAGEMENT.md`

### Files Modified:
- `backend/src/app/app.ts`
- `src/features/owner/components/OwnerNav.tsx`
- `src/features/owner/index.ts`
- `src/router/index.tsx`

### Files Deleted:
- None

---

## 14. PHASE 8G RECOMMENDATION
Proceed to **Phase 8G — Gym Owner Billing & Revenue Overview**:
- Organization subscription tier & billing management.
- Razorpay B2B merchant verification and invoices for the gym facility.
- Real revenue counters scoped to organization.
