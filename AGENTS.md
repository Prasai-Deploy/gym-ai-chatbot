# PERMANENT AGENT INSTRUCTIONS & ENGINEERING RULES

This file defines the mandatory engineering standards, architectural constraints, and operational rules for all AI agents (including Antigravity) working on the STRIVA codebase.

---

## 1. PRODUCT IDENTITY & AI NAMING CONVENTIONS

1. **Target Architecture**: All new code, refactoring, and features must target **STRIVA V2**.
2. **Official AI Identity**: **TRINETRA** is the exclusive product brand name for STRIVA's AI intelligence layer.
3. **Strict Terminology Prohibition**: Do **NOT** use legacy "Trinity" terminology in any new code files, variable names, class names, API endpoints, system prompts, or documentation. Use `TRINETRA` or `trinetra` exclusively.
4. **No Duplicate Page/Component Naming**: Do **NOT** introduce `V2<Page>`, `V3<Page>`, `Minimal<Card>`, `New<Component>`, or `Premium<Component>` duplicate naming conventions. All components must be canonical primitives inside `src/design-system/`.

---

## 2. SECURITY & MULTI-TENANCY RULES

5. **No Client-Controlled Tenant Headers**: Never trust client HTTP headers such as `x-organization-id` or body parameters to establish tenant authorization. Tenant identity **MUST** be derived server-side from verified Supabase Auth JWT identity and database org membership lookups.
6. **No Hardcoded Tenant IDs**: String literals like `'00000000-0000-0000-0000-000000000001'` or fallback tenant UUIDs are strictly **PROHIBITED** in production code. Unauthenticated or unassigned tenant requests must fail closed (`403 Forbidden`).
7. **Mandatory Database RLS**: Every PostgreSQL table storing user-owned or organization-owned data **MUST** enable PostgreSQL Row Level Security (RLS) policies in `backend/supabase/migrations/`.
8. **Server-Side Security Enforcement**: Client-side UI checks are for visual convenience only. Authorization **MUST** be enforced in Express middleware (`auth.middleware.ts`, `rbac.middleware.ts`) and database policies.

---

## 3. DATA INTEGRITY & API CONTRACTS

9. **No Mock Data Fallbacks**: Frontend API callers (`httpClient.ts`, `useStrivaApi.ts`) must **NEVER** catch network or server errors and silently return hardcoded/mock fallback JSON objects. All API failures must propagate clean errors to the UI.
10. **Canonical Migrations Directory**: All database DDL changes must be versioned SQL files stored exclusively in `backend/supabase/migrations/`. Unversioned root `.sql` scripts or manual dashboard DDL edits are forbidden.
11. **REST API Versioning**: All backend HTTP API endpoints must be prefixed with `/api/v1/`.
12. **Domain Service Encapsulation**: Domain services and repositories own database access and business logic calculations. Controllers and AI tools must consume domain services, never executing raw unvalidated DB queries directly.

---

## 4. TRINETRA AI INTEGRATION RULES

13. **Tool Execution Boundary**: TRINETRA accesses STRIVA features strictly through validated domain tools registered in `ToolRegistry.ts`. Tools must delegate business logic to backend domain services.
14. **Real Usage Analytics**: All TRINETRA requests must record actual prompt/completion token counts, model names, latency, and tool execution status into `ai_usage`. Token counts must **NEVER** be mocked.
15. **Configurable Provider**: AI logic must interact through the `AIProvider` interface. Do not hardwire provider-specific hacks directly into core business services.

---

## 5. BILLING & PAYMENTS

16. **Razorpay Primary Provider**: Razorpay REST API is the primary billing integration for India. Stripe code is legacy/inactive and must not be used in MVP.
17. **Cryptographic HMAC Validation**: Payment completions and webhooks **MUST** be verified server-side using HMAC SHA-256 signatures with constant-time string comparisons (`crypto.timingSafeEqual`). Never trust client-reported payment success alone.

---

## 6. WORKFLOW & CODE QUALITY CONSTRAINTS

18. **Definition of Done (DoD)**: A feature is complete **ONLY** when frontend UI, backend module, database schema/RLS, Zod validation, error handling, mobile layout, unit/security tests, and API specs are fully implemented.
19. **Safe Legacy Deprecation**: Do **NOT** delete legacy files (`server.legacy.ts`, `legacy/`) until a safety Git checkpoint tag is created and the migration step is explicitly approved.
20. **No Unnecessary Dependencies**: Do not install new NPM packages or add heavy third-party libraries without explicit justification.
