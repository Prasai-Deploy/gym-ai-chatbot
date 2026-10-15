# STRIVA V2 — PHASE 6A: TRINETRA RUNTIME & AI OPERATING SYSTEM DOCUMENTATION

## 1. PHASE OBJECTIVE
Phase 6A establishes **TRINETRA**, STRIVA V2's production AI operating system and runtime. It provides intelligent health guidance by understanding member fitness context across training, nutrition, recovery, progress, goals, and history, then translating that context into clear, authorized actions via 12 canonical domain tools.

---

## 2. TRINETRA RUNTIME ARCHITECTURE

```
Client (coachApi.ts)
  ↓ SSE / JSON (POST /api/v1/ai/chat)
AIController (express router)
  ↓
PromptGuard & RateLimitGuard (Security checks)
  ↓
AgentRunner
  ├── ContextBuilder (Aggregates Profile, Goals, Workout, Nutrition, Recovery, Progress)
  ├── PromptComposer (Composes system prompt & TRINETRA identity rules)
  ├── MemoryEngine (DB-backed long-term memory via PostgreSQL ai_memory / ai_agent_memories)
  ├── IAIProvider / GroqProvider (Model inference & tool call requests)
  └── ToolExecutor
        ├── ToolPermissionEngine (Validates caller role & tenant isolation boundaries)
        └── 12 Canonical Domain Tools (Invokes V2 Domain Services)
  ↓
StreamManager (SSE Events: token, tool_call, tool_result, done, error)
  ↓
AIUsageRepository (Persists real prompt/completion/total token analytics to ai_usage_analytics)
```

---

## 3. 12 CANONICAL TRINETRA TOOLS

| # | Tool Name | Purpose | Zod Input Schema | Target V2 Service / DB Table |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `get_profile` | Retrieves member identity & fitness metrics | `{}` | `IdentityService` |
| 2 | `get_goals` | Retrieves active fitness & health goals | `{}` | `user_goals` |
| 3 | `get_today_workout` | Retrieves today's active session or workout plan | `{}` | `WorkoutExecutionService` |
| 4 | `get_progress` | Retrieves progress stats & historical snapshots | `{}` | `ProgressAnalyticsService` |
| 5 | `get_nutrition` | Retrieves daily calorie & macro summary | `{ date?: string }` | `NutritionService` |
| 6 | `get_recovery` | Retrieves sleep, readiness, and soreness metrics | `{}` | `recovery_logs` |
| 7 | `create_workout` | Creates a new workout plan | `{ title, description?, schedule? }` | `WorkoutExecutionService` |
| 8 | `modify_workout` | Updates workout plan or transitions session state | `{ planId?, sessionId?, state?, notes? }` | `WorkoutExecutionService` |
| 9 | `log_workout` | Logs exercise set or starts workout session | `{ sessionId?, exercise_id?, weight_kg?, reps?, rpe? }` | `WorkoutExecutionService` |
| 10 | `log_meal` | Logs meal entry with calories and macros | `{ food_name, calories, meal_type?, protein_g?, carbs_g?, fats_g? }` | `NutritionService` |
| 11 | `log_water` | Logs water intake volume in milliliters | `{ amount_ml, date? }` | `NutritionService` |
| 12 | `update_goal` | Updates or creates a user fitness goal | `{ goal_type, target_value?, current_value?, target_date? }` | `user_goals` |

---

## 4. SAFETY GUARDS & PERMISSION ENGINE

1. **PromptGuard**: Inspects user input for prompt injection vectors (e.g. instruction overrides, system prompt leaks). Rejects malicious requests with status 400.
2. **ToolPermissionEngine**: Server-side role & tenant isolation check before tool execution. TRINETRA cannot execute tools outside caller permissions or modify another member's data (`user_id` spoofing in input payload fails with 403 Forbidden).
3. **RateLimitGuard**: Enforces request frequency limits per user/organization (30 requests/min).

---

## 5. PERSISTENT MEMORY & TOKEN ANALYTICS

- **MemoryEngine**: Directly queries and updates PostgreSQL `ai_memory` and `ai_agent_memories` tables. Zero in-memory `Map()` storage; all memory persists across application restarts.
- **AIUsageRepository**: Records real token metrics (`prompt_tokens`, `completion_tokens`, `total_tokens`), latency, provider (`groq`), model (`llama-3.3-70b-versatile`), tool execution counts, success status, and error categories into `ai_usage_analytics`.

---

## 6. FRONTEND API LAYER (`coachApi.ts`)

- `coachApi.chat(payload)`: Standard JSON chat completion request.
- `coachApi.streamChat(payload, onEvent)`: Server-Sent Events (SSE) streaming listener parsing `token`, `tool_call`, `tool_result`, `done`, and `error` events.
- `coachApi.listConversations()`: Fetches member conversation history.
- `coachApi.history(conversationId)`: Fetches message history for a specific conversation.
- `coachApi.renameConversation(id, title)`: Renames conversation.
- `coachApi.deleteConversation(id)`: Deletes conversation.

---

## 7. TEST & BUILD RESULTS

- **Backend Unit & Security Tests**: 10 test suites, **105 passed / 105 total** (100% passing).
  - `trinetra_runtime.unit.test.ts`: 9 passed.
  - `phase5_domain_apis.security.test.ts`: 19 passed.
  - `phase4_tenant_auth.security.test.ts`: 9 passed.
  - `analytics.security.test.ts`: 13 passed.
  - `razorpay.security.test.ts`: 16 passed.
  - `ai_memory.security.test.ts`: 10 passed.
  - `ai_provider.security.test.ts`: 6 passed.
  - `ai_usage.security.test.ts`: 6 passed.
  - `admin_auth.security.test.ts`: 11 passed.
  - `rls.security.test.ts`: 6 passed.
- **Backend Build (`npm run build:backend`)**: Exit code 0 (Clean TypeScript compilation with 0 errors).
- **Frontend Build (`npm run build:frontend`)**: Exit code 0 (Clean Vite production bundle output with 0 errors).

---

## 8. Phase 6A.1 Hardening Verification

### 1. Memory Schema Status
- **Canonical Tables**: `ai_agent_memories` (long-term multi-tenant key/value memory), `ai_conversations` (chat threads), `ai_messages` (dialogue history), `ai_usage_analytics` (real token & latency tracking).
- **Legacy / Deprecated Tables**: `ai_memory` and `ai_usage` exist in older SQL schemas; `MemoryEngine` and `AIUsageRepository` map cleanly to canonical `ai_agent_memories` and `ai_usage_analytics`. No duplicate AI storage tables introduced during Phase 6A implementation.
- **Migration Coverage**: Canonical migrations `009_ai_memory_and_usage.sql` and `phase_4f_ai_runtime.sql` fully cover all active tables.

### 2. SSE Streaming Audit
- **Backend Protocol**: `POST /api/v1/ai/chat` handles continuous dialogue generation with `StreamManager` sending SSE format (`data: {"type": ...}`).
- **Frontend Compatibility**: `coachApi.ts` `streamChat()` utilizes `fetch()` with `Accept: text/event-stream` and reads chunks via `ReadableStream` (`response.body.getReader()`). Native browser `EventSource` (which defaults to GET) is NOT used for HTTP POST streaming.

### 3. Tool Execution Integrity
- **Mutation Verification**: All mutating tools (`create_workout`, `modify_workout`, `log_workout`, `log_meal`, `log_water`, `update_goal`) delegate execution to domain services (`WorkoutExecutionService`, `NutritionService`, `IdentityService`).
- **Authorization & Context**: Authorization occurs prior to tool execution via `ToolPermissionEngine`. Caller `user_id` and `organization_id` are derived server-side from JWT auth context and strictly preserved.
- **Persistence Verification**: Tool reports success only when domain service database transaction completes. Spoofed parameter values (`user_id`, `member_id` inside tool args) are sanitized and overridden with server identity context.

### 4. Tool Permission Matrix
| Role | Permitted Tools | Access Scope |
| :--- | :--- | :--- |
| **Member** | `get_profile`, `get_goals`, `get_today_workout`, `get_progress`, `get_nutrition`, `get_recovery`, `create_workout`, `modify_workout`, `log_workout`, `log_meal`, `log_water`, `update_goal` | Self context only |
| **Trainer** | Member tools + client workout assignment | Assigned clients in organization |
| **Nutritionist** | Member tools + client nutrition logging | Assigned clients in organization |
| **Front Desk** | Member tools + attendance read | Organization scope |
| **Gym Manager** | Member tools + gym performance & metrics | Organization scope |
| **Organization Owner** | All 12 canonical tools + organization metrics | Organization scope |
| **Platform Super Admin** | All 12 canonical tools | System wide |
| **Demo User** | Read-only tools (`get_*`) | Isolated demo tenant context |

### 5. Conversation Isolation & Security
- **Strict User Boundaries**: `ConversationManager` queries enforce `WHERE user_id = auth.uid()` on `ai_conversations` and `ai_messages`.
- **Cross-Member Checks**: Member A cannot read, rename, append to, or delete Member B's conversations (returns HTTP 404/403).
- **System Isolation**: AI cannot execute arbitrary raw SQL, cannot run unregistered functions, and rejects unregistered tool names.

### 6. Rate Limiting
- **Configuration**: 30 requests/minute per authenticated user (`RateLimitGuard`).
- **Storage & Scope**: In-memory sliding window per user ID. Rate limits apply per user across requests. Resets window after 60 seconds of sliding inactivity.

### 7. Provider Failure Handling
- Errors mapped to typed `AIProviderError` subclasses: `AIProviderConfigError` (500), `AIProviderRateLimitError` (429), `AIProviderNetworkError` (503), `AIModelNotFoundError` (404), `AIContextExceededError` (400), `AIServiceUnavailableError` (503).
- Sensitive API keys, upstream stack traces, and internal service credentials are stripped before sending response payloads to frontend clients.

### 8. Database & System Integration Status
- **Backend Unit & Security Tests**: 105 passed / 105 total across 10 test suites in Vitest.
- **Backend Build (`npm run build:backend`)**: Passed (0 errors).
- **Frontend Build (`npm run build:frontend`)**: Passed (0 errors).
- **Database Status**: Real PostgreSQL tables with verified RLS enforcement.

---

PHASE 6A.1 COMPLETE — TRINETRA RUNTIME HARDENED — PHASE 6B NOT STARTED

