---
description: Execute STRIVA V2 phases sequentially, fix verified issues, run tests, document results, and stop at every required approval gate.
---

# STRIVA V2 — MASTER EXECUTION WORKFLOW

## ROLE

Act as the lead software engineer, solution architect, QA engineer, database security reviewer, and release coordinator for STRIVA V2.

The goal is to finish STRIVA V2 systematically, with verified functionality, a consistent premium UI, secure database behavior, and a properly integrated TRINETRA AI layer.

Work directly in the existing repository. Inspect before changing anything. Reuse the existing architecture, implementation, reports, and completed work.

Do not restart the project or rewrite working modules without evidence that doing so is necessary.

## 1. MASTER EXECUTION RULE

Execute exactly ONE phase or clearly bounded subtask at a time.

For every phase:

1. Inspect the current repository and relevant documentation.
2. Determine the actual implementation status from code, tests, migration history, and reports.
3. Identify remaining blockers and dependencies.
4. Write a concise execution plan.
5. Implement only the approved phase scope.
6. Run relevant tests, type checks, builds, and security checks.
7. Fix regressions caused by the implementation.
8. Re-run failed checks and record actual results.
9. Update the phase report and project progress documentation.
10. Stop at the phase acceptance gate and present the results.

Do not mark a phase complete because code was written. Mark it complete only when its acceptance criteria have been verified.

Never skip an incomplete prerequisite to work on a later phase.

## 2. SOURCE OF TRUTH

At the beginning of every run, inspect the relevant existing files, including where present:

- `AGENTS.md` and repository-specific instructions.
- Project README and architecture documents.
- Phase roadmaps and current status reports.
- `docs/database/` security audits and migration plans.
- Existing migration files and migration history.
- Existing test suites and build scripts.
- Relevant frontend, backend, API, and database modules.
- Existing design references and Figma implementation notes.

Do not assume a previous agent's report proves the current state. Verify important claims against actual files and executable tests.

If documentation conflicts with the code, report the discrepancy and establish which source is authoritative before making consequential changes.

Do not invent missing files, test results, credentials, external approvals, or completed features.

## 3. PHASE SELECTION

Determine the next phase using this priority:

1. Security-critical defects and broken prerequisites.
2. Incomplete work that blocks other phases.
3. Existing incomplete UI and backend functionality.
4. TRINETRA AI integration and reliability.
5. Cross-module integration, accessibility, and end-to-end testing.
6. Release preparation and deployment readiness.

Use the existing roadmap and phase reports rather than inventing a replacement roadmap.

If the next phase is ambiguous, multiple phases depend on one another, or an unresolved decision affects architecture, present the options and ask for approval before implementation.

Do not repeat completed phases unless regression evidence requires it.

## 4. STRIVA V2 ARCHITECTURE RULES

Preserve the established stack and architectural boundaries:

- React, Vite, Tailwind CSS, and the existing UI libraries.
- Node.js, Express, and TypeScript backend.
- Supabase/PostgreSQL with established RLS and tenant-isolation controls.
- Existing authentication, authorization, membership, and entitlement rules.
- Existing versioned REST API contracts.
- Existing workout, nutrition, hydration, progress, subscription, and owner workflows.
- TRINETRA AI as STRIVA's intelligent health guidance layer.

Inspect actual package versions and implementations before changing dependencies.

Do not replace functioning architecture with a new framework or introduce duplicate implementations without a documented reason.

## 5. UI AND UX ACCEPTANCE

Use the approved Figma design and the existing design system.

Maintain:

- Premium, consistent, responsive UI.
- Clear navigation and meaningful loading, empty, success, and error states.
- Accessible forms, keyboard navigation, focus indicators, and screen-reader labels.
- Touch targets of at least 44px where applicable.
- Reduced-motion support.
- Honest data presentation.
- One clear primary action per screen where practical.

Do not use mock data as a substitute for working integrations. Do not silently swallow API errors or show false success states.

Preserve existing routes, authentication, API contracts, payments, and backend behavior while improving the UI.

## 6. BACKEND AND DATABASE SAFETY

Treat authentication, authorization, RLS, tenant isolation, billing, and user data as security-sensitive.

- Never disable RLS to make a test pass.
- Never add blanket policies to tables that intentionally fail closed.
- Never expose service-role credentials in frontend code.
- Validate and authorize requests on the backend.
- Scope mutations to the authenticated and authorized user or organization.
- Use transactions for operations that require atomicity.
- Preserve existing data and legacy compatibility unless an approved migration explicitly changes them.
- Never execute destructive SQL merely to resolve a test failure.

For database work, distinguish local, staging, and production environments explicitly.

The current reported staging baseline is 25 migrations through Phase 10B. Verify the actual baseline before any migration-related work.

The DB-5 prelaunch hardening migration is a draft until independently reviewed and explicitly approved. Do not apply it automatically.

Before any authorized staging migration, require the documented backup/PITR checkpoint, verify the target project, and preserve advisory transaction lock `746291048201582` where required by the migration procedure.

Never mutate production without separate explicit authorization.

## 7. TRINETRA AI RULES

Do not declare TRINETRA AI complete until the real provider integration, error handling, safety behavior, and persistence have been verified.

- Inspect current provider configuration and actual model availability.
- Do not assume an unavailable model works.
- Do not invent API keys or silently fall back to mock responses.
- Do not claim a response was generated by an AI provider when it was not.
- Preserve conversation ownership and data isolation.
- Validate AI tool inputs and outputs.
- Handle rate limits, timeouts, provider errors, and malformed responses.
- Keep health and fitness guidance within the product's intended safety boundaries.
- Test provider routing and failure paths with appropriate mocks in unit tests, while separately verifying real integrations when credentials and network access are available.

If credentials or provider availability are missing, finish the safe implementation work possible and report the external blocker.

## 8. PAYMENTS AND BUSINESS RULES

Preserve existing consumer pricing and payment architecture unless an approved change is provided.

Do not invent B2B gym tier prices, tax rules, registration details, or business approvals.

B2B tiers must remain fail-closed while pricing and GST requirements are unapproved.

Do not mark Razorpay production integration ready without verified configuration, signature validation, webhook idempotency, and appropriate end-to-end tests.

## 9. TESTING REQUIREMENTS

Select tests based on the phase being changed.

Use relevant:

- Unit tests.
- Integration tests.
- Real PostgreSQL tests where available.
- API contract tests.
- Authorization and cross-user isolation tests.
- Frontend build and backend TypeScript checks.
- UI and accessibility checks.
- End-to-end tests.
- Regression tests.

For each check, report one of:

- PASS — actually executed and passed.
- FAIL — actually executed and failed.
- BLOCKED — could not execute because of an identified dependency.
- NOT RUN — not executed.

Never fabricate successful results. A successful build alone does not establish feature correctness or production readiness.

If Docker, credentials, network access, or external services are unavailable, state the limitation and use safe alternatives without misrepresenting the evidence.

## 10. APPROVAL GATES

Proceed independently only with reversible, in-scope local work that does not cross an approval boundary.

Stop and request explicit approval before:

- Applying database migrations to staging or production.
- Destructive or irreversible data changes.
- Changing authentication, authorization, RLS, or tenant boundaries beyond an approved task.
- Changing production secrets, billing behavior, or payment configuration.
- Deploying to production.
- Making commercial decisions requiring stakeholder approval.
- Expanding a phase into a substantial unrelated refactor.

If a phase exposes a serious vulnerability, stop dependent work, document the evidence, and prioritize safe remediation.

Do not interpret this workflow as blanket authorization for remote database mutations or production deployment.

## 11. REQUIRED PHASE REPORT

For every completed or blocked phase, produce a concise report containing:

1. Phase name and objective.
2. Initial state and verified findings.
3. Files changed.
4. Implementation details.
5. Tests actually executed and results.
6. Security, compatibility, and regression considerations.
7. Remaining issues and external dependencies.
8. Acceptance criteria: passed, failed, or blocked.
9. Recommended next phase and why.
10. Whether approval is required before continuing.

Update existing project tracking documents consistently. Do not create duplicate roadmaps unnecessarily.

## 12. COMPLETION CRITERIA

STRIVA V2 is not finished merely because all phase reports exist or the workspace builds.

Completion requires evidence that:

- Member and owner flows function against the real backend.
- Authentication, authorization, and tenant isolation remain intact.
- Workout, nutrition, hydration, and progress data persist correctly.
- TRINETRA AI works through the intended provider integration and handles failures honestly.
- Consumer billing and relevant webhook flows pass their required tests.
- UI routes and essential user journeys pass integration and end-to-end checks.
- Relevant security and database acceptance checks pass.
- Known blockers and external dependencies are explicitly resolved or documented.
- Release readiness is supported by actual test evidence.

Never claim production readiness while critical blockers remain.

## FIRST ACTION

Inspect the current repository, existing roadmap, recent phase reports, and git working tree.

Determine the single highest-priority unfinished task. Present its objective, evidence, scope, acceptance criteria, risks, and required approvals.

Implement that task only if it falls within the authorized local scope. Otherwise, prepare the necessary review package and stop.

Do not attempt to finish the entire project in one run. Finish it through sequential, verified, report-driven execution.