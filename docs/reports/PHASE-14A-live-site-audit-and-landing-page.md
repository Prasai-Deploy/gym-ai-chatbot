# STRIVA V2 — Phase 14A: Live-Site Failure Audit & Public Landing Page Report

**Document Date:** October 15, 2026  
**Status:** **PHASE 14A PASS — LANDING PAGE IMPLEMENTED AND VERIFIED LOCALLY**  
**Target Environment:** Local Workspace Verification Only (No Remote Deployments Executed)  

---

## 1. Executive Summary

Phase 14A investigated live production anomalies on `https://stirva.space/`, established verifiable root causes for user-reported failures, designed and implemented a public-facing landing page at `/`, repaired routing and authentication state preservation, and confirmed that all backend and frontend builds and test suites pass locally.

### Key Deliverables Completed:
1. **Live Domain & Routing Audit:** Identified domain mismatch (`stirva.space` vs `striva.space`), route-level fallback bounce into authentication, route-guarding of public pricing, and missing versioned health endpoints.
2. **Canonical Public Landing Page (`/`):** Implemented a responsive, accessible SaaS landing page following STRIVA's modern dark void aesthetic (`#050608`) with athletic lime accents (`#84CC16`).
3. **Product Capabilities & Interactive Showcase:** Built a preview displaying genuine platform telemetry (TRINETRA AI Coach, Hypertrophy Workout Execution, Macro/Hydration Tracking, Progress Analytics).
4. **Verified Pricing Architecture:** Integrated authentic STRIVA V2 consumer pricing (Monthly at ₹799/mo and Annual at ₹6,999/yr with ~27% savings indicator and 14-day free trial). Public visitors can view plans and toggle terms without being forced to authenticate.
5. **Seamless Auth & Return Flow:** Public visitors can access `/` and `/pricing` freely. Unauthenticated checkout clicks navigate to `/login` with location memory (`state: { from: location }`), and `/login` features an explicit "Back to STRIVA Home" link.
6. **Automated Regression Suite:** 20 dedicated routing and landing regression tests passing (`landing_page_and_routing.unit.test.ts`), plus full workspace build passing (`vite build` + `tsc && tsc-alias`).

---

## 2. Confirmed Live & Repository Issues with Root Causes

| # | Anomaly / Symptom | Status | Verified Root Cause | Remediation |
|---|-------------------|--------|---------------------|-------------|
| **1** | Visiting `https://stirva.space/` immediately bounced unauthenticated users to `/login`. No product info, hero, or landing page appeared. | **CONFIRMED & FIXED** | `src/router/index.tsx` had **no route mounted at `/`**. The fallback `<Route path="*" element={<Navigate to="/v3/dashboard" replace />} />` forwarded to a `<ProtectedRoute>`, which intercepted unauthenticated requests and redirected them to `/login`. | Mounted canonical `LandingPage` at `/` in `src/router/index.tsx` and moved catch-all redirect to `/`. |
| **2** | Unauthenticated visitors could not inspect plans at `/pricing`. | **CONFIRMED & FIXED** | `/pricing` was wrapped within `<ProtectedRoute>`, demanding an active Supabase session before plan details or pricing tiers could be viewed. | Relocated `/pricing` under public routes in `src/router/index.tsx`. Updated `PricingPage.tsx` so unauthenticated users can browse plans; clicking "Start 14-Day Free Trial" redirects to `/login` with return state. |
| **3** | Post-login redirect loss when redirected from protected resources. | **CONFIRMED & FIXED** | `src/components/ProtectedRoute.tsx` used `<Navigate to="/login" replace />` without attaching `state: { from: location }`. | Updated `ProtectedRoute.tsx` to pass `state: { from: location }`. Updated `Login.tsx` to read `location.state?.from?.pathname` and navigate to the intended target upon authentication. Added "Back to STRIVA Home" link. |
| **4** | Health monitoring probes returning HTTP 404 on API paths. | **CONFIRMED & FIXED** | Backend Express server only mounted health routes on `/health`. Probes targeting standard REST prefix `/api/v1/health` failed. | Mounted `healthRouter` on both `/health` and `/api/v1/health` in `backend/src/app/app.ts`. |
| **5** | Domain Name & Typography (`stirva.space` vs `striva.space`). | **CONFIRMED (INFRA)** | The live site is hosted on Hostinger at `stirva.space` (transposed `ir`). The canonical brand domain `striva.space` currently has **no DNS records** (`ENOTFOUND`). Furthermore, `index.html` contained stale OpenGraph URLs (`striva.ai`). | Cleaned `index.html` metadata. Documented operator DNS actions below for production domain management. |

---

## 3. Files Changed and Architectural Rationale

### 1. `src/pages/LandingPage.tsx` (NEW)
- **Role:** High-impact public landing page introducing STRIVA before user authentication.
- **Sections:**
  - Sticky glassmorphic navigation with STRIVA wordmark, anchor links (`#features`, `#capabilities`, `#pricing`, `#faq`), and intelligent session CTA (shows "Dashboard" if logged in, or "Sign in" + "Get started" if guest).
  - High-conversion Hero section with copy: *"Train with purpose. Progress with intelligence."* and supporting narrative: *"Plan workouts, track nutrition, understand your progress, and get personalized guidance with STRIVA."*
  - Interactive Product Capabilities tabs (TRINETRA AI Coach, Hypertrophy Workout Session, Macro & Hydration Tracking, Progress Telemetry).
  - 3-step "How It Works" onboarding progression (Profile & Biometrics, Intelligent Planning, Adaptive Execution).
  - Membership pricing table (verified ₹799/mo or ₹6,999/yr, feature breakdown, 14-day trial CTA).
  - Interactive FAQ accordion addressing intelligence layer, gym memberships, trial policies, and data export.
  - Footer with platform status indicators, legal links, and brand copyright.
- **Design Tokens:** Follows Tailwind CSS dark palette (`bg-[#050608]`, `border-white/10`, `text-zinc-400`, `text-white`), lime athletic accents (`#84CC16`), touch targets $\ge$ 44px, and keyboard-accessible elements.

### 2. `src/router/index.tsx` (MODIFIED)
- **Role:** Core React router definitions.
- **Changes:**
  - Registered `/` as a public route rendering `LandingPage` wrapped in `PublicLayout`.
  - Registered `/pricing` as a public route rendering `PricingPage` wrapped in `PublicLayout`.
  - Updated catch-all route `*` to redirect to `/` instead of forcing a bounce to `/v3/dashboard`.

### 3. `src/features/billing/pages/PricingPage.tsx` (MODIFIED)
- **Role:** Plan comparison and Razorpay checkout initiation.
- **Changes:**
  - Lifted mandatory authentication requirement for page viewing.
  - Added guest fallback handling on the checkout button: if not authenticated, redirects to `/login` with `state: { from: { pathname: '/pricing' } }`.
  - Added home navigation link in breadcrumbs.

### 4. `src/components/ProtectedRoute.tsx` (MODIFIED)
- **Role:** Route guard for member and gym owner private routes.
- **Changes:**
  - Injected `state: { from: location }` into the `<Navigate to="/login" replace />` invocation to ensure deep links are preserved across login redirects.

### 5. `src/components/Login.tsx` (MODIFIED)
- **Role:** Authentication page (Google OAuth + Demo credentials).
- **Changes:**
  - Integrated `useLocation` to retrieve `location.state?.from?.pathname`.
  - Post-login navigation respects the return location, defaulting to `/v3/dashboard`.
  - Added explicit "← Back to STRIVA Home" link at bottom of login card.

### 6. `backend/src/app/health.ts` & `backend/src/app/app.ts` (MODIFIED)
- **Role:** Express server bootstrapping and health check telemetry.
- **Changes:**
  - Mounted `healthRouter` at both `/health` and `/api/v1/health` to satisfy both root probes and versioned REST conventions.

### 7. `index.html` (MODIFIED)
- **Role:** SPA HTML shell.
- **Changes:**
  - Updated title to `STRIVA — Intelligent Fitness & Workout Architecture`.
  - Updated meta descriptions and OpenGraph tags to align with STRIVA V2.

### 8. `backend/tests/unit/landing_page_and_routing.unit.test.ts` (NEW)
- **Role:** Automated unit test suite verifying routing consistency, health endpoint routing, and landing page asset contracts.

---

## 4. Test and Build Execution Records

### A. Dedicated Phase 14A Unit Tests
```
npm --workspace backend test -- tests/unit/landing_page_and_routing.unit.test.ts
```
**Result:**
- `Test Suites: 1 passed, 1 total`
- `Tests: 20 passed, 20 total`
- `Snapshots: 0 total`
- `Time: 1.638 s`

### B. Full Backend Unit Test Suite
```
npm --workspace backend test -- tests/unit
```
**Result:**
- `Test Suites: 8 passed, 8 total`
- `Tests: 104 passed, 104 total`
- `Snapshots: 0 total`
- `Time: 3.535 s`

### C. Backend Security Test Suite
```
npm --workspace backend test -- tests/security
```
**Result:**
- `Test Suites: 39 passed, 39 total`
- `Tests: 643 passed, 643 total`
- `Snapshots: 0 total`
- `Time: 33.722 s`

### D. Full Workspace Production Build
```
npm run build
```
**Result:**
```
> react-example@0.0.0 build
> npm run build:frontend && npm run build:backend

> react-example@0.0.0 build:frontend
> vite build

vite v6.4.3 building for production...
transforming...
✓ 3241 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                   4.25 kB │ gzip:   1.59 kB
dist/assets/index-DScVC98N.css                  199.04 kB │ gzip:  26.08 kB
dist/assets/LandingPage-CXTFLEVB.js              88.87 kB │ gzip:  10.97 kB
dist/assets/PricingPage-DgHutoqS.js              21.06 kB │ gzip:   3.35 kB
dist/assets/Login-cSQAY9Vw.js                     9.13 kB │ gzip:   2.45 kB
...
✓ built in 17.32s

> react-example@0.0.0 build:backend
> npm --workspace backend run build

> striva-backend@1.0.0 build
> tsc && tsc-alias
```
**Exit Code:** `0` (Success, zero TypeScript errors, zero bundling errors).

---

## 5. Local Browser & UX Verification

A subagent performed automated browser verification against the local development server (`http://localhost:5173/`).
Artifact recording: `landing_page_demo_1792077270574.webp`.

### Browser Verification Highlights:
1. **Initial View (`/`):** Loaded instantly. Rendered high-contrast hero typography, dynamic CTA buttons, and responsive navbar.
2. **Interactive Preview Tabs:** Clicked through all 4 preview states (TRINETRA AI Coach, Workout Execution, Nutrition & Hydration, Progress Analytics). Interactive state transitions executed cleanly.
3. **Pricing Toggle:** Switched between Annual (`₹6,999/yr`, saving ~27%) and Monthly (`₹799/mo`). Verified price recalculation and 14-day trial badges.
4. **Accordion:** Tested FAQ accordion items; smoothly expanded and collapsed without layout shifts.
5. **Auth Navigation:** Clicked "Sign In" in header -> smoothly transitioned to `/login`.
6. **Return Link:** Clicked "← Back to STRIVA Home" on `/login` -> smoothly navigated back to `/`.

---

## 6. Remaining Deployment & Operator Blockers

Because Phase 14A is strictly restricted from executing staging or production deployments, the following operator actions must be executed during the scheduled deployment window:

1. **Deploy Frontend Build to Hostinger CDN:**
   - Run `npm run build:frontend`.
   - Upload the resulting `dist/` directory contents to the public web root on Hostinger.
   - Verify SPA rewrite rules (`.htaccess` or Hostinger SPA fallback config) to ensure all URLs (`/`, `/pricing`, `/login`, `/v3/*`) route to `dist/index.html`.
2. **Domain & DNS Configuration:**
   - Clarify intended production domain: `striva.space` vs `stirva.space`.
   - If `striva.space` is the intended official domain, configure Hostinger DNS A/CNAME records for `striva.space` and establish a 301 redirect from `stirva.space`.
3. **Supabase Auth Redirect URLs:**
   - In the Supabase Cloud Dashboard, verify that `Redirect URLs` includes both:
     - `https://stirva.space/auth/callback`
     - `https://striva.space/auth/callback` (if using canonical spelling)
     - `http://localhost:5173/auth/callback` (local dev)
4. **Deploy Backend API Updates:**
   - Deploy backend build (`dist/` from `npm --workspace backend run build`) to the API server so `/api/v1/health` is live.

---

## 7. Safety & Compliance Statement

- **Production Environment:** Strictly untouched. No commands or deployments were run against production infrastructure.
- **Staging Environment:** Strictly untouched.
- **Database Migrations:** No remote DDL/DML, migrations, or database schema changes were executed during this phase.
- **Secrets & Customer Data:** No secrets, credentials, or live customer records were modified or exposed.
- **Architecture Integrity:** STRIVA V2 architecture, Supabase RLS, TRINETRA AI interfaces, and Razorpay HMAC contracts remain fully intact.

---

## 8. Final Status

```
========================================================================
PHASE 14A PASS — LANDING PAGE IMPLEMENTED AND VERIFIED LOCALLY
========================================================================
```
