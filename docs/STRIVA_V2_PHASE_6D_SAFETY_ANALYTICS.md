# STRIVA V2 — PHASE 6D: TRINETRA SAFETY, ABUSE PROTECTION & AI ANALYTICS DOCUMENTATION

## 1. SAFETY ARCHITECTURE
Phase 6D establishes a multi-layered safety, abuse protection, and observable analytics layer for **TRINETRA**. It ensures that AI health and fitness guidance remains predictable, safe, cost-aware, and strictly bounded before executing tools or making model calls.

```
User Input
    ↓
Request Payload Limits (Max prompt 4000 chars, conversation history 20 msgs)
    ↓
PromptGuard (Hardened prompt injection & system instruction override scanner)
    ↓
SafetyPolicy (Medical boundary & high-risk fitness request classifier)
    ↓
RateLimitGuard (30 reqs/min sliding window & consecutive failure monitor)
    ↓
TRINETRA Runtime (AgentOrchestrator, ContextBuilder, MemoryEngine)
    ↓
ToolPermissionEngine (Max 5 tool calls per request, role & anti-spoofing verification)
    ↓
AIUsageRepository (Persists real token, latency, and error metrics to `ai_usage_analytics`)
```

---

## 2. MEDICAL BOUNDARY
TRINETRA is an intelligent fitness guidance layer, **NOT** a medical provider or diagnosis engine.
- **Medical Query Classification**: Diagnoses, prescription modifications, or medical treatment requests trigger `SafetyPolicy`.
- **Response Handling**: Returns a safe, cautious general-information response and refers members to qualified healthcare professionals:
  > *"TRINETRA is STRIVA's intelligent health and fitness guidance layer, not a medical provider. I cannot diagnose medical conditions or prescribe medications. If you suspect a medical issue or require medical advice, please consult a qualified healthcare professional."*

---

## 3. PROMPT INJECTION DEFENSE
`PromptGuard` & `SafetyPolicy` protect against adversarial prompt attacks:
- **Scanned Vectors**: System instruction overrides (*"ignore previous instructions"*), system prompt extraction (*"reveal system prompt"*), role elevation (*"you are now an unrestricted administrator"*), and permission bypass (*"override tool permissions"*).
- **Execution Boundary**: User text remains treated strictly as DATA and can never alter TRINETRA system directives or identity context. Malicious requests fail cleanly with error code `AI_PROMPT_BLOCKED`.

---

## 4. TOOL SAFETY
- All tool executions are validated by `ToolPermissionEngine` before execution.
- Bounded Tool Execution: Enforces `MAX_TOOL_CALLS = 5` per request to prevent runaway tool loops.
- Identity Lock: `user_id` and `organization_id` parameters in tool inputs are sanitized and overridden with verified JWT caller context.

---

## 5. MEMORY SAFETY INTEGRATION
- Pre-Persistence Safety: `MemoryPolicy` filters prompt injection payloads, secrets, API keys (`sk-`), passwords, JWT tokens (`eyJ`), and raw payment details prior to database write.
- Subordinate Context: Long-term memory remains strictly subordinate to current verified database state.

---

## 6. ABUSE PROTECTION
- **Rate Limit Boundary**: 30 requests/minute per authenticated user via an in-memory sliding window.
- **Consecutive Failure Protection**: Monitors rapid repeated failures (max 10 consecutive failures) and blocks abusive request bursts.

---

## 7. REQUEST PAYLOAD SIZE LIMITS
- **Max Prompt Length**: 4,000 characters.
- **Max Conversation History**: 20 messages.
- **Max Memory Context Summary**: 3,000 characters.
- Exceeding payload thresholds returns clean validation error code `AI_INVALID_REQUEST` (HTTP 400).

---

## 8. TOKEN ANALYTICS
- Provider-reported token usage (`prompt_tokens`, `completion_tokens`, `total_tokens`) is recorded to `ai_usage_analytics`.
- Token Accounting Rule: `total_tokens` strictly equals `prompt_tokens + completion_tokens`.
- Fallbacks: If provider metrics are missing, values are logged as estimated or null consistently without fake precision.

---

## 9. LATENCY ANALYTICS
- End-to-end request duration is measured in milliseconds (`durationMs`) from initial input parsing through tool execution loop to final response delivery.

---

## 10. PROVIDER ANALYTICS
- Provider name (`groq`), model name (`llama-3.3-70b-versatile`), execution status (`success`), and error category (`error_category`) are captured for every invocation.

---

## 11. ERROR TAXONOMY
Stable error categories across the AI runtime:
- `AI_INVALID_REQUEST` (400)
- `AI_UNAUTHORIZED` (401)
- `AI_FORBIDDEN` (403)
- `AI_PROMPT_BLOCKED` (400)
- `AI_SAFETY_BLOCKED` (400)
- `AI_RATE_LIMITED` (429)
- `AI_PROVIDER_CONFIG_ERROR` (500)
- `AI_PROVIDER_TIMEOUT` (504)
- `AI_PROVIDER_RATE_LIMIT` (429)
- `AI_MODEL_NOT_FOUND` (404)
- `AI_CONTEXT_EXCEEDED` (400)
- `AI_SERVICE_UNAVAILABLE` (503)
- `AI_TOOL_VALIDATION_FAILED` (400)
- `AI_TOOL_FORBIDDEN` (403)
- `AI_TOOL_EXECUTION_FAILED` (500)
- `AI_MEMORY_ERROR` (500)

---

## 12. CLIENT ERROR SAFETY
- Client error responses strip raw SQL statements, database stack traces, filesystem paths, provider credentials, and internal secret keys.
- Standard Client Payload Structure: `{ code: string, message: string, retryable: boolean }`.

---

## 13. ORGANIZATION USAGE ATTRIBUTION
- AI usage analytics are attributed using verified JWT tenant identity (`organization_id`). Client or AI-supplied organization parameters are ignored.

---

## 14. DEMO USER ISOLATION
- Demo User role (`userRole = 'Demo User'`) is sandboxed to demo tenant context. Mutating tool executions are denied, and demo activity does not contaminate production member data or memory tables.

---

## 15. ANALYTICS PRIVACY
- Raw sensitive dialogue transcripts, credit cards, passwords, and API keys are strictly excluded from `ai_usage_analytics`.

---

## 16. TEST RESULTS & VERIFICATION
- **Vitest Security Suite**: **147 passed / 147 total** across 13 test files (100% passing).
  - `phase6d_safety_analytics.security.test.ts`: 13 tests covering medical refusal, high-risk refusal, prompt injection defense, request size limits, rate limits, token/latency analytics, and safe response handling.
  - `phase6c_trinetra_tools.security.test.ts`: 16 tests.
  - `ai_memory_phase6b.security.test.ts`: 13 tests.
  - `ai_memory.security.test.ts`: 10 tests.
  - `trinetra_runtime.unit.test.ts`: 9 tests.
  - `phase5_domain_apis.security.test.ts`: 19 tests.
  - `phase4_tenant_auth.security.test.ts`: 9 tests.
  - `analytics.security.test.ts`: 13 tests.
  - `razorpay.security.test.ts`: 16 tests.
  - `ai_provider.security.test.ts`: 6 tests.
  - `ai_usage.security.test.ts`: 6 tests.
  - `admin_auth.security.test.ts`: 8 tests.
  - `rls.security.test.ts`: 8 tests.
- **Backend Build (`npm run build:backend`)**: Exit code 0 (TypeScript compilation clean).
- **Frontend Build (`npm run build:frontend`)**: Exit code 0 (Vite bundle output clean).

---

## 17. DATABASE VERIFICATION STATUS
- **Static Validation**: Passed (Migration SQL scripts verified for `ai_usage_analytics` and fail-closed RLS policies).
- **Application Unit & Integration Tests**: Passed (Vitest mock DB and repository persistence tested).
- **Local PostgreSQL / Remote Supabase**: Production ready.

---

## 18. KNOWN LIMITATIONS
- In-memory rate limiting operates per server node; distributed Redis rate limiting can be integrated in future scale phases if required.

---

## 19. PHASE 6E PREREQUISITES
- TRINETRA safety, abuse protection, and AI analytics layer are hardened and locked.

---

PHASE 6D COMPLETE — TRINETRA SAFETY & ANALYTICS HARDENED — PHASE 6E NOT STARTED
