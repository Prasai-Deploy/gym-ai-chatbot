# STRIVA V2 — PHASE 7B MEMBER HOME

## Objective
Build the canonical STRIVA Member Home experience at `/v3/dashboard` centered around the core question: **"What should I do today?"**

Deliver a dark-first, focused, highly readable daily command center structured by strict visual hierarchy without fake metrics, fake activity, or enterprise dashboard grids.

## Existing Home Audit
Previous `DashboardGrid.tsx` contained hardcoded scores (e.g., 88 health score), hardcoded workout titles, and fixed calorie statistics. These were replaced with dynamic semantic components backed by real API responses and graceful empty states.

## Final Home Information Architecture
- **Header**: Contextual greeting ("Good morning / afternoon / evening, [Name]") + date badge + "Here's what matters today."
- **LEVEL 1 — Today Focus (`TodayFocus.tsx`)**: Primary focal card rendering state-dependent training recommendation:
  - State A: Scheduled workout / active session in progress with "Start Workout" / "Resume Workout" action.
  - State B: Rest & recovery day guidance.
  - State C: No workout scheduled empty state with "Explore Workouts".
- **LEVEL 2 — Today Plan (`TodayPlanSummary.tsx`)**: Compact summary of today's scheduled training plan title and description.
- **LEVEL 3 — Current Status (`StatusSummary.tsx`)**: Real hydration (total mL logged + quick `+250 mL` log action via API) and real nutrition summary.
- **LEVEL 4 — Recent Consistency (`ConsistencySummary.tsx`)**: Real workout count and active streak statistics from `/api/v1/progress/statistics`.
- **LEVEL 5 — Quick Actions (`HomeQuickActions.tsx`)**: Secondary shortcuts (Start Workout, Ask TRINETRA, Log Water, Log Meal) and TRINETRA guidance prompt.

## Files Created
- `src/design-system/dashboard/TodayFocus.tsx` — Level 1 primary recommendation and action focal card.
- `src/design-system/dashboard/TodayPlanSummary.tsx` — Level 2 compact plan summary card.
- `src/design-system/dashboard/StatusSummary.tsx` — Level 3 status overview for real hydration and nutrition data.
- `src/design-system/dashboard/ConsistencySummary.tsx` — Level 4 progress and consistency context card.
- `src/design-system/dashboard/HomeQuickActions.tsx` — Level 5 quick actions and TRINETRA guidance prompt.
- `docs/STRIVA_V2_PHASE_7B_MEMBER_HOME.md` — Phase 7B documentation and verification report.

## Files Modified
- `src/hooks/useStrivaApi.ts` — Added `useMemberHomeData()` composite hook querying `/identity/me`, `/workouts/today`, `/nutrition/daily`, and `/progress/statistics`.
- `src/design-system/dashboard/DashboardGrid.tsx` — Assembled Levels 1–5 layout with dark-first styling and generous spacing.
- `src/v3/pages/V3DashboardPage.tsx` — Connected `useMemberHomeData()` to `DashboardGrid`, handling loading skeletons, error state with retry button, and real data passing.

## Files Deleted
NONE.

## Routes
- `/v3/dashboard` *(Canonical Member Home route strictly preserved)*

## API Sources Used
- `GET /api/v1/identity/me` — Authenticated member profile context (`name`, `email`, `role`).
- `GET /api/v1/workouts/today` — Today's active workout session or scheduled workout plan (`activeSession`, `latestPlan`).
- `GET /api/v1/nutrition/daily` — Today's nutrition and water logs (`totalWaterMl`, `totalCalories`, `totalProtein`, `meals`).
- `POST /api/v1/nutrition/water` — Inline hydration logging (`amount_ml`).
- `GET /api/v1/progress/statistics` — Training consistency metrics (`workout_count`, `current_streak`, `longest_streak`).

## New API Changes
NONE. All data is fetched from pre-existing canonical REST endpoints.

## Database Changes
NONE. No database DDL changes or Supabase migrations were introduced.

## Real Data vs Empty States
- All numbers, titles, and dates rendered on Home derive exclusively from verified backend API responses.
- If no workout is scheduled, Home displays a clean empty state ("No workout scheduled for today").
- If no water or nutrition is logged, Home displays zero/empty status ("No water logged") rather than hardcoded mock figures.
- Zero fake completion percentages, fake calories, or fake AI messages.

## TRINETRA Integration
Subtle TRINETRA presence is integrated via a clean prompt ("Need guidance? Ask TRINETRA for workout recommendations, recovery advice, or nutrition guidance.") navigating directly to `/v3/coach`. No fake AI content or unauthorized AI runtime edits were introduced.

## Responsive Verification
Verified viewports:
- Desktop: 1440px, 1280px
- Tablet: 1024px, 768px
- Mobile: 430px, 390px, 375px

## Accessibility Verification
- High contrast text (`text-white`, `text-slate-300`, `text-orange-400`).
- Touch target sizes exceed 44px on mobile quick actions.
- Focus visible indicators enabled on all interactive elements.

## Performance Considerations
- Parallel async fetching using TanStack Query in `useMemberHomeData()`.
- 5-minute stale time for identity query to minimize redundant network requests.
- Automatic query invalidation on water logging mutation.

## Tests
- **Backend Unit & Security Tests**: 157 passed (14 test files).

## Builds
- **Backend Build (`npm run build:backend`)**: Successful (Exit Code 0).
- **Frontend Build (`npm run build:frontend`)**: Successful (2400 modules transformed, 0 errors, Exit Code 0).

## Scope Verification
Explicitly confirmed that Phase 7C Coach, 7D Workout execution, 7E Nutrition engine, 7F Progress analytics, 7G Profile settings, 7H UX verification, Gym Owner OS, Billing redesign, and TRINETRA backend engine changes were **NOT** implemented in this phase.

## Known Limitations
Full interactive workout execution, TRINETRA conversation interface, nutrition meal logging UI, and deep biometric analytics belong to subsequent Phase 7 sub-phases (7C–7G).

## Next Phase
Phase 7C — TRINETRA Coach

PHASE 7B COMPLETE — MEMBER HOME READY — PHASE 7C NOT STARTED
