# STRIVA V2 — PHASED IMPLEMENTATION ROADMAP

## 1. MASTER 17-PHASE ROADMAP

| Phase | Title | Objective / Scope | Primary Deliverables | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 0** | Product + V1 Audit | Read-only codebase audit & structural inventory | Audit Report | ✅ **COMPLETED** |
| **Phase 1** | Architecture + Master Spec | Lock core specs, TRINETRA definition, and docs | Master Spec Docs | ⏳ **IN PROGRESS** |
| **Phase 2** | Safety & Development Setup | Create Git tag/backup, setup clean dev environment | Backup & Scripting | NEXT |
| **Phase 3** | Database Consolidation & RLS| Consolidate migrations into `backend/supabase/migrations/` | SQL Migrations + RLS | PLANNED |
| **Phase 4** | Auth, Multi-Tenancy & RBAC | Patch tenant middleware, enforce Supabase JWT auth | Auth & Tenant Middleware| PLANNED |
| **Phase 5** | Member Foundation | Member profile, preferences & home dashboard shell | Member Views & Repos | PLANNED |
| **Phase 6** | Workout Engine | Workout routine preview, active set tracking & 1RM | Workout Module & UI | PLANNED |
| **Phase 7** | Nutrition Engine | Calorie, macro, water logging & daily summaries | Nutrition Module & UI | PLANNED |
| **Phase 8** | Progress Engine | Strength progression curves & body composition metrics| Progress Module & UI | PLANNED |
| **Phase 9** | TRINETRA AI Engine | Build 12 TRINETRA domain tools & Groq orchestrator | TRINETRA Tools & Agent | PLANNED |
| **Phase 10**| Gym Operations (Owner OS)| Build STATE -> ATTENTION -> ACTION owner dashboard | Gym Views & QR Check-in | PLANNED |
| **Phase 11**| Billing & Razorpay Integration| Razorpay modal checkout, verification & webhooks | Billing Module & Pages | PLANNED |
| **Phase 12**| Real-Time Analytics | Gym occupancy, MRR trends & member retention signals| Analytics Module & UI | PLANNED |
| **Phase 13**| Notifications Engine | Workout reminders, payment renewal & TRINETRA alerts | Notification Module | PLANNED |
| **Phase 14**| Production Security Hardening| Rate limiting, CORS, Helmet, PII audit, E2E security | Security Audit Pass | PLANNED |
| **Phase 15**| Beta Release & Verification | End-to-end integration testing & load testing | Test Suite & Beta Build | PLANNED |
| **Phase 16**| Public Launch | Production deployment, monitoring & public release | Launch Build | PLANNED |

---

## 2. REPOSITORY ASSET CATEGORIZATION & CLEANUP STRATEGY

To ensure zero risk of breaking active code during Phase 2+, repository assets are categorized below:

| Asset Name | Current Path | Action Category | Target V2 Location | Cleanup Timing |
| :--- | :--- | :--- | :--- | :--- |
| Modular Backend Server | `backend/src/` | **KEEP** | `backend/src/` | Immediate foundation |
| Razorpay Provider | `backend/src/modules/billing/providers/RazorpayProvider.ts` | **KEEP** | `backend/src/modules/billing/` | Immediate foundation |
| Security Test Suite | `backend/tests/security/` | **KEEP** | `backend/tests/security/` | Immediate foundation |
| Design Tokens & Shell | `src/design-system/` | **KEEP / MERGE** | `src/design-system/` | Phase 5 |
| Supabase SQL Migrations| `backend/supabase/migrations/` | **KEEP / MERGE** | `backend/supabase/migrations/` | Phase 3 |
| Monolithic Server | `server.legacy.ts` | **DEPRECATE / DELETE** | N/A | Phase 2 (After Git backup) |
| Legacy Backend Folder | `legacy/` | **DEPRECATE / DELETE** | N/A | Phase 2 (After Git backup) |
| Legacy SQL Scripts | `schema.sql`, `v2_additive_migration.sql` | **DEPRECATE / DELETE** | N/A | Phase 3 |
| Legacy UI Components | `src/components/WorkoutTracker.tsx`, etc. | **DEPRECATE / DELETE** | N/A | Phase 6 |
| Unused NPM Dependencies| `stripe`, `connect-pg-simple`, `passport` | **PURGE** | `package.json` | Phase 2 |

---

## 3. SAFE MIGRATION STRATEGY

1. **Git Worktree / Tag Safety**: Before executing any file deletion or major refactoring in Phase 2, tag the existing state: `git tag -a v1-audit-checkpoint -m "Pre-V2 cleanup safety checkpoint"`.
2. **Data Model Migration**: Legacy integer user records (`users.id INT`) will be mapped to Supabase Auth UUIDs (`auth.users.id UUID`) using a dedicated SQL bridge script before dropping legacy tables.
3. **Phase-by-Phase Verification**: No phase will be marked complete without executing `npm run build` and verifying that zero regression errors occur.
