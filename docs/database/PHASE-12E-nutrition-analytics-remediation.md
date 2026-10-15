# STRIVA V2 — Phase 12E: Nutrition Analytics Defect Remediation Report

**Document Version:** 1.0.0  
**Remediation Date / Local Time:** 2026-10-15 12:08 IST  
**Defect Remediated:** `DB12D-01` (Member Nutrition Analytics Undercounting)  
**Target Scope:** Application Code & Security Test Suite Only  
**Remote Environment:** Staging `ymrblyiwohvxptiqjfsi` (Audit & Invariant Baseline Only)  
**Remote DDL/DML Executed in this Phase:** Strictly 0 (Zero remote connections, zero mutations, zero migrations)  
**Production Database Status:** Strictly Off-Limits & Untouched  
**Final Phase Status:** **PHASE 12E PASS — DEFECT FIXED AND REGRESSION VERIFIED**  

---

## 1. Executive Summary

During the Phase 12D Post-Deployment Integration Audit, defect **DB12D-01** was uncovered in the member nutrition analytics engine. The engine read `log.calories_consumed || 0`, whereas the canonical database table `public.v2_nutrition_logs` (defined in `backend/supabase/migrations/phase_10a_nutrition_core_schema.sql`) declares the column name as `calories` (`INTEGER NOT NULL DEFAULT 0`). Because `AnalyticsRepository.getNutritionLogsForUsers` executes `select('*') from 'v2_nutrition_logs'`, the runtime objects contain `.calories` rather than `.calories_consumed`. This caused `log.calories_consumed` to evaluate to `undefined`, defaulting calories to `0` and resulting in a 100% undercount (`avgCaloriesLogged = 0`).

In Phase 12E, this defect was remediated with a minimal surgical code fix in `backend/src/modules/analytics/AnalyticsEngines.ts`, adopting the repository's canonical-first fallback pattern (`log.calories ?? log.calories_consumed ?? 0`). A focused regression test suite was added to `backend/tests/security/analytics.security.test.ts` verifying that canonical records containing only `calories: 2400` (without `calories_consumed`) correctly aggregate into member analytics.

---

## 2. Defect and Root Cause (DB12D-01)

### Identification
- **Defect ID:** `DB12D-01`
- **Location:** `backend/src/modules/analytics/AnalyticsEngines.ts` (Line 550)
- **Defective Expression:**
  ```typescript
  const cals = log.calories_consumed || 0;
  ```

### Root Cause
1. **Schema Divergence:** In the canonical STRIVA V2 database schema (`phase_10a_nutrition_core_schema.sql`), nutrition rows are stored in `public.v2_nutrition_logs` with the column name `calories`:
   ```sql
   CREATE TABLE IF NOT EXISTS public.v2_nutrition_logs (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       date DATE NOT NULL DEFAULT CURRENT_DATE,
       meal_type VARCHAR(50) NOT NULL DEFAULT 'snack',
       food_name TEXT NOT NULL,
       calories INTEGER NOT NULL DEFAULT 0,
       ...
   );
   ```
2. **DTO Artifact:** The name `calories_consumed` was a legacy attribute present in input DTOs (`IntelligenceSchemas.ts`), but was never a column in `v2_nutrition_logs` or legacy `nutrition_logs`.
3. **Runtime Undercount:** When `AnalyticsRepository.getNutritionLogsForUsers` queried `v2_nutrition_logs`, returned objects had property `.calories`. `log.calories_consumed` was `undefined`, causing `cals` to resolve to `0`. Consequently:
   - `totalCalories` evaluated to `0`.
   - `avgCaloriesLogged = Math.round(totalCalories / logs.length)` evaluated to `0`.
   - `dayCaloriesMap` totals evaluated to `0`.

---

## 3. Files Changed and Exact Code Correction

### 1. `backend/src/modules/analytics/AnalyticsEngines.ts`

**Line 550:**
```diff
     for (const log of logs) {
-      const cals = log.calories_consumed || 0;
+      const cals = log.calories ?? log.calories_consumed ?? 0;
       const protein = log.protein_g || 0;
       totalCalories += cals;
```

**Design Rationale:**
- **Canonical-First Precedence:** Uses `log.calories` as the authoritative canonical value.
- **Nullish Coalescing (`??`):** Avoids falsy zero-value bugs where `0` calories (e.g. fasting/water logs) would unintentionally fall through.
- **Backward Compatibility:** Preserves graceful fallback to `log.calories_consumed` if older DTO fixtures or synthetic event objects are processed, matching the pattern in `NutritionService.ts` (`log.calories ?? log.calories_consumed ?? 0`).

---

## 4. Regression Test and Fixture Details

### Target File: `backend/tests/security/analytics.security.test.ts`

Two new regression tests were introduced:

### 1. Canonical Production Schema Fixture (`calories: 2400` strictly without `calories_consumed`)
```typescript
it('6b. Nutrition KPI computes canonical v2_nutrition_logs calories without calories_consumed field (DB12D-01 regression)', async () => {
  db.profiles = [{ id: 'usr-1', organization_id: 'org-A' }];
  // Canonical production schema fixture: strictly contains `calories: 2400` and omits `calories_consumed`
  db.v2_nutrition_logs = [
    { id: 'nl-canonical-1', user_id: 'usr-1', date: '2026-08-10', calories: 2400, protein_g: 140 },
  ];

  const repo = new AnalyticsRepository(createMockSupabase());
  const nutritionEngine = new NutritionAnalyticsEngine(repo);
  const nutrition = await nutritionEngine.compute('org-A', period);

  expect(nutrition.avgCaloriesLogged).toBe(2400);
  expect(nutrition.avgProteinAdherencePct).toBe(100);
  expect(nutrition.membersLoggingDaily).toBe(1);
  expect(nutrition.topDeficitDay).toBe('Monday');
});
```

### 2. Backward Compatibility Fixture (Legacy `calories_consumed` fallback)
```typescript
it('6c. Nutrition KPI supports legacy calories_consumed fallback when canonical calories is absent', async () => {
  db.profiles = [{ id: 'usr-1', organization_id: 'org-A' }];
  // Legacy schema fallback fixture: only `calories_consumed` is populated
  db.v2_nutrition_logs = [
    { id: 'nl-legacy-1', user_id: 'usr-1', date: '2026-08-10', calories_consumed: 1800, protein_g: 140 },
  ];

  const repo = new AnalyticsRepository(createMockSupabase());
  const nutritionEngine = new NutritionAnalyticsEngine(repo);
  const nutrition = await nutritionEngine.compute('org-A', period);

  expect(nutrition.avgCaloriesLogged).toBe(1800);
  expect(nutrition.avgProteinAdherencePct).toBe(100);
});
```

---

## 5. Verification Commands, Results, Counts, and Exit Codes

### 1. Focused Regression Test
- **Command:** `npx vitest run tests/security/analytics.security.test.ts -t "6b. Nutrition KPI computes canonical"`
- **Working Directory:** `backend/`
- **Exit Code:** `0`
- **Result:**
  ```
  ✓ tests/security/analytics.security.test.ts (15 tests | 14 skipped) 19ms
  Test Files: 1 passed (1)
  Tests: 1 passed | 14 skipped (15)
  Duration: 639ms
  ```

### 2. Full Analytics Security Test File
- **Command:** `npx vitest run tests/security/analytics.security.test.ts`
- **Working Directory:** `backend/`
- **Exit Code:** `0`
- **Result:**
  ```
  ✓ tests/security/analytics.security.test.ts (15 tests) 40ms
  Test Files: 1 passed (1)
  Tests: 15 passed (15)
  Duration: 1.02s
  ```

### 3. Complete Security Suite
- **Command:** `npx vitest run tests/security/`
- **Working Directory:** `backend/`
- **Exit Code:** `0`
- **Result:**
  ```
  Test Files: 36 passed (36)
  Tests: 589 passed (589)
  Failures: 0
  Duration: 4.93s
  ```

### 4. Backend TypeScript Build
- **Command:** `npm run build` (`tsc && tsc-alias`)
- **Working Directory:** `backend/`
- **Exit Code:** `0`
- **Result:** Compilation succeeded with 0 TypeScript diagnostics or alias resolution errors.

### 5. Frontend & Full Workspace Build
- **Command:** `npm run build` (`npm run build:frontend && npm run build:backend`)
- **Working Directory:** Workspace root (`CHATBOT_PROJECT/`)
- **Exit Code:** `0`
- **Result:**
  - `vite build`: 3,240 modules transformed, production bundles generated (`dist/index.html`, `dist/assets/`).
  - `backend build`: `tsc && tsc-alias` succeeded.

---

## 6. Review and Scope Control

A strict review of the working tree confirms:
1. **Targeted Code Changes:** Only `backend/src/modules/analytics/AnalyticsEngines.ts` and `backend/tests/security/analytics.security.test.ts` were modified.
2. **Canonical Fixture Quality:** New test fixture `nl-canonical-1` strictly contains `calories: 2400` and does **not** include `calories_consumed`.
3. **No Weakened Assertions:** Existing test cases 1 through 13 in `analytics.security.test.ts` were preserved. Test coverage was strictly expanded from 13 to 15 tests.
4. **Zero Database Mutations:** No SQL migrations were executed, no PostgreSQL DDL/DML was applied to remote staging, and no database policies or grants were modified.
5. **No Production Exposure:** Production remains strictly untouched and protected.

---

## 7. Statement of Remote Database Non-Modification

> **Formal Statement:** During Phase 12E, no connections were made to mutate any remote database. Staging project `ymrblyiwohvxptiqjfsi` was not modified in any way. No migrations were executed, no tables or columns were altered, no RLS policies were modified, and the production environment was not accessed. All activities in this phase were strictly restricted to local application code remediation, automated unit/security tests, and production builds.

---

## 8. Final Status

```
================================================================================
FINAL STATUS: PHASE 12E PASS — DEFECT FIXED AND REGRESSION VERIFIED
================================================================================
```
