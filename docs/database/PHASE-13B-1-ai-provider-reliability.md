# STRIVA V2 — Phase 13B-1: TRINETRA AI Provider Reliability Report

**Execution Date**: 2026-10-15  
**Final Status**: `PHASE 13B-1 PASS — AI TIMEOUT AND FALLBACK VERIFIED`  
**Target Architecture**: STRIVA V2 / TRINETRA Intelligence Layer  
**Target Environment**: Local Workspace & Test Runner (Staging/Production Untouched)

---

## 1. Executive Summary

During Phase 13A (Production Readiness and Risk Closure Audit), risk item **RISK-03** identified that TRINETRA outbound inference calls in `backend/src/modules/ai/providers/GroqProvider.ts` lacked a bounded HTTP network timeout and had no secondary-model fallback mechanism. If the primary model experienced transient capacity constraints, rate limits (HTTP 429), server downtime (HTTP 503), or prolonged network latency, client requests could hang indefinitely or fail abruptly without self-healing.

Phase 13B-1 has resolved this risk by implementing:
1. **Bounded Request Timeout**: A strict 15-second timeout enforced via `AbortSignal.timeout(15000)` on all outbound Groq API requests, cleanly translated into the project's canonical `AIProviderTimeoutError` (HTTP 504, category `TIMEOUT_ERROR`).
2. **Transient Secondary-Model Fallback**: Bounded, single-attempt fallback to `GROQ_FALLBACK_MODEL` when primary inference encounters eligible transient errors (HTTP 429, 404, 503, 504, 5xx, or network failures).
3. **Fail-Closed Permanent Protection**: Permanent failures (401/403 authentication, 400 validation, context length, missing credentials) fail closed immediately without retry or fallback.
4. **Strict Analytics & Token Accounting**: Guaranteed single-write persistence to `ai_usage_analytics` per turn, recording the exact model that answered and verified token usage, preventing double-counting or recording aborted requests as successful completions.
5. **Comprehensive Automated Verification**: 16 dedicated reliability unit/integration tests added; all 605 backend security tests and both frontend/backend production builds verified passing cleanly.

---

## 2. Identified Defect & Root Cause Analysis

| Component | Pre-13B-1 State | Defect & Operational Impact |
| :--- | :--- | :--- |
| **Request Timeout** | `fetch(...)` invoked with no `signal` or timeout option | Slow or unresponsive Groq edge nodes could stall backend worker threads indefinitely, consuming Node.js connection pools and exhausting Express HTTP sockets. |
| **Model Redundancy** | Single primary model invocation; failed calls immediately threw to caller | Transient Groq rate limits (429 TPM/RPM) or temporary service disruptions (503) resulted in immediate end-user chat failure with no automatic mitigation. |
| **Model Configuration** | Hardcoded model fallbacks in legacy strings; missing structured validation in `env.ts` | Disconnected configuration schema; no standard environment variable contract for secondary-model fallback. |
| **Error Taxonomy** | Generic network catch translated any fetch rejection to `AIProviderNetworkError` | Timeout and abort signals were indistinguishable from DNS/TCP connection drops, preventing granular client response codes (504 vs 503). |

---

## 3. Architecture & Design Decisions

### 3.1. Bounded Request Timeout (`AbortSignal.timeout`)
- Implemented `AbortSignal.timeout(this.timeoutMs)` directly inside the fetch options in `GroqProvider.executeCompletion`.
- Standard default timeout: **15,000 ms** (15 seconds).
- Native Node.js `DOMException` error names (`TimeoutError`, `AbortError`, code `23`) are intercepted before generic error handlers and mapped to `AIProviderTimeoutError`:
  - HTTP Status: `504 Gateway Timeout`
  - Category: `TIMEOUT_ERROR`
  - Provider: `groq`
- Aborted or timed-out requests never return a `ChatResponse` and cannot be recorded as successful completions.

### 3.2. Validated Environment Schema
Added `GROQ_PRIMARY_MODEL` and `GROQ_FALLBACK_MODEL` to Zod validation schema in `backend/src/config/env.ts`:
```typescript
GROQ_PRIMARY_MODEL: z.string().optional().default(process.env.GROQ_PRIMARY_MODEL || 'openai/gpt-oss-20b'),
GROQ_FALLBACK_MODEL: z.string().optional().default(process.env.GROQ_FALLBACK_MODEL || ''),
```
Both consumer TRINETRA routes (`backend/src/modules/ai/routes.ts`) and B2B Org Advisor routes (`backend/src/modules/ai/advisor/orgAdvisor.routes.ts`) inject these validated configuration values into `GroqProvider`.

### 3.3. Fallback Model Eligibility Matrix
Fallback is strictly bounded to at most **one retry** on the secondary model (`canFallback` checks model existence, non-emptiness, and differentiation from current model):

| Error Condition | HTTP Status | Error Class | Fallback Eligible? | Rationale |
| :--- | :---: | :--- | :---: | :--- |
| **Rate Limit** | 429 | `AIProviderRateLimitError` | **YES** | Secondary model has independent per-model TPM/RPM quotas on Groq. |
| **Request Timeout** | 504 | `AIProviderTimeoutError` | **YES** | Primary model execution hung; secondary model may respond promptly. |
| **Service Unavailable** | 503 | `AIServiceUnavailableError` | **YES** | Transient provider node capacity issue. |
| **Model Not Found** | 404 | `AIModelNotFoundError` | **YES** | Primary model decommissioned or misspelled; secondary recovers service. |
| **Upstream Server Error** | 500 / 502 | `AIProviderError` | **YES** | Transient Groq internal inference server failure. |
| **Network Error** | 503 | `AIProviderNetworkError` | **YES** | Socket drop or network reset during request. |
| **Invalid API Key / Auth** | 401 / 403 | `AIProviderConfigError` | **NO** | Permanent credential failure; secondary model will fail identically. |
| **Missing API Key** | 500 | `AIProviderConfigError` | **NO** | Permanent configuration failure. |
| **Validation / Bad Request** | 400 | `AIProviderError` | **NO** | Client prompt/tool syntax error; retrying fails identically. |
| **Context Length Exceeded** | 400 | `AIContextExceededError` | **NO** | Input exceeds window; retrying same prompt without pruning will fail. |

### 3.4. Token Accounting & Analytics Persistence Integrity
- `GroqProvider.executeCompletion` extracts token usage from `data.usage` and records `model: data.model || model`.
- If fallback succeeds, the response returned to `AgentRunner` contains `model: fallbackModel`.
- `AgentRunner.run` receives the single winning `ChatResponse` and persists **exactly one** record to `ai_usage_analytics` via `usageRepo.recordUsage`:
  - `model`: records actual model used (`qwen/qwen3.8-27b` during fallback, or `openai/gpt-oss-20b` during primary).
  - `promptTokens`, `completionTokens`, `totalTokens`: records real Groq usage; never mocked.
  - `success`: `true`
  - `errorCategory`: `null`
- If both primary and fallback fail (or timeout occurs with no fallback):
  - `AgentRunner` catches the error and persists **exactly one** failure record with `success: false`, `errorCategory: 'TIMEOUT_ERROR'`, and `promptTokens: null`.
  - Zero duplicate records; zero double-counted tokens.

---

## 4. Verification & Test Evidence

### 4.1. Focused Provider Reliability Test Suite
- **Test File**: `backend/tests/security/groq_provider_reliability.security.test.ts`
- **Command**: `npx vitest run tests/security/groq_provider_reliability.security.test.ts`
- **Exit Code**: `0`
- **Results**: 16 passing tests (0 failures)

| # | Test Scenario | Verified Behavior |
| :-: | :--- | :--- |
| 1 | **Successful Primary Inference** | Primary model (`openai/gpt-oss-20b`) called once; exact token counts returned; signal attached. |
| 2a | **Primary Timeout (No Fallback)** | Rejection mapped to `AIProviderTimeoutError` (504, `TIMEOUT_ERROR`, message with timeout duration). |
| 2b | **DOMException Abort Translation** | `AbortError` / code 23 translated cleanly into `AIProviderTimeoutError`. |
| 3a | **Primary 429 → Successful Fallback** | Primary fails 429; fallback (`qwen/qwen3.8-27b`) invoked and succeeds; returns fallback model metadata. |
| 3b | **Primary 503 → Successful Fallback** | Primary 503 triggers secondary model call; succeeds with 200 OK. |
| 3c | **Primary 404 → Successful Fallback** | Deprecated primary model triggers secondary fallback; recovers gracefully. |
| 3d | **Primary Timeout → Successful Fallback** | Primary request timeout triggers fallback invocation; fallback completes successfully. |
| 4 | **Fallback Failure Handling** | Primary fails 429, secondary fails 503; throws `AIServiceUnavailableError`; strictly bounded to 2 calls. |
| 5a | **Missing Fallback Model** | Undefined fallback model fails immediately on primary error with 1 fetch call. |
| 5b | **Identical Fallback Model** | Fallback matching primary model is skipped to avoid redundant duplicate calls. |
| 6a | **401 Unauthorized Non-Retryable** | Auth error throws `AIProviderConfigError` immediately; 1 fetch call; no fallback. |
| 6b | **403 Forbidden Non-Retryable** | Suspended/forbidden throws `AIProviderConfigError` immediately; 1 fetch call; no fallback. |
| 6c | **400 Bad Request Non-Retryable** | Malformed parameters throw `AIProviderError` (400) immediately; 1 fetch call; no fallback. |
| 6d | **Empty API Key Pre-Flight** | Empty string throws `AIProviderConfigError` without calling network (0 fetch calls). |
| 7a | **Analytics Single-Write on Fallback** | `AgentRunner` writes exactly 1 analytics record with `model: 'qwen/qwen3.8-27b'` and exact tokens. |
| 7b | **Aborted Requests Non-Success** | Timed out/aborted request records 1 failure record (`success: false`, `errorCategory: 'TIMEOUT_ERROR'`). |

### 4.2. Relevant AI Security & Chatbot Test Suites
- **Command**: `npx vitest run tests/security/ai_chatbot_audit_remediation.security.test.ts tests/security/ai_usage.security.test.ts tests/security/ai_provider.security.test.ts tests/security/groq_provider_reliability.security.test.ts tests/security/phase6c_trinetra_tools.security.test.ts tests/security/phase6d_safety_analytics.security.test.ts tests/security/phase6e_e2e_release_gate.security.test.ts tests/security/phase8j_b2b_trinetra.security.test.ts`
- **Exit Code**: `0`
- **Results**: 8 test files, 96 tests passed (0 failures)

### 4.3. Full Backend Security Test Suite
- **Command**: `npx vitest run tests/security/`
- **Exit Code**: `0`
- **Results**: 37 test files, 605 tests passed (0 failures, 100% pass rate)

### 4.4. Build Verification
- **Backend Build**: `npm run build` in `backend/` (`tsc && tsc-alias`) → **Exit Code 0**
- **Root Workspace Build**: `npm run build` in project root (`vite build` + `npm --workspace backend run build`) → **Exit Code 0** (3,240 frontend modules compiled; backend compiled)

---

## 5. Scope Review & Audit

```
Modified Files:
- backend/src/config/env.ts
- backend/src/modules/ai/providers/AIProviderError.ts
- backend/src/modules/ai/providers/GroqProvider.ts
- backend/src/modules/ai/routes.ts
- backend/src/modules/ai/advisor/orgAdvisor.routes.ts

Added Files:
- backend/tests/security/groq_provider_reliability.security.test.ts
- docs/database/PHASE-13B-1-ai-provider-reliability.md
```

- **Database Schemas & Migrations**: Zero database migrations added or modified. PostgreSQL RLS policies, tables, and routine definitions untouched.
- **Remote Environments**: Zero interactions with staging or production environments. Staging database remained at baseline 28.
- **Consumer Analytics Endpoint**: Not implemented in this subphase; deferred to Phase 13B-2 per scope boundary.
- **Credentials & Secrets**: Zero API keys or secrets logged, committed, or exposed.

---

## 6. Free-Tier Quota & Credential Limitations

> [!WARNING]
> **Code Hardening vs. Provider Account Quotas**:  
> Implementing bounded timeouts and secondary-model fallback significantly increases application resilience against transient network delays and single-model capacity saturation. However, code-level fallback **does not** eliminate free-tier provider account limits.
>
> 1. **Shared Organization Quotas**: If a Groq free-tier account exhausts its daily token quota across all models, fallback will attempt secondary inference and both will return HTTP 429.
> 2. **Operational Recommendation**: Production deployment requires either a funded Groq commercial tier or a multi-provider fallback strategy (e.g. Groq primary with Gemini API or Anthropic secondary) configured via environment variables.

---

## 7. Final Phase Status

```
====================================================================
PHASE 13B-1 PASS — AI TIMEOUT AND FALLBACK VERIFIED
====================================================================
```
All Phase 13B-1 requirements are satisfied, verified by automated tests, and documented. Ready for Phase 13B-2 planning upon user review.
