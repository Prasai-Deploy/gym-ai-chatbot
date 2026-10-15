# STRIVA V2 — PHASE 7C TRINETRA COACH

## Objective
Build the canonical member-facing TRINETRA Coach experience at `/v3/coach`. Provide a dark-first, premium AI fitness advisor experience featuring real-time SSE token streaming, conversation history management, tool execution activity pills, initial empty state with concise suggested prompts, and robust safety/error handling.

## Existing TRINETRA Architecture Reused
Phase 7C reuses the existing backend AI infrastructure verified in Phase 6A–6E without introducing duplicate AI engines, providers, or custom schemas:
- `AgentRunner`
- `ContextBuilder`
- `PromptComposer`
- `ConversationManager`
- `StreamManager`
- `ToolExecutor`
- `GroqProvider`
- `ToolRegistry` (12 canonical tools)
- `ToolPermissionEngine`
- `MemoryEngine`
- `SafetyPolicy`
- `PromptGuard`
- `RateLimitGuard`
- `ai_usage` analytics

## Frontend Architecture
- **Hook**: `src/features/coach/hooks/useTrinetraCoach.ts` manages conversation state, API interaction via `coachApi.ts`, POST-based SSE stream consumption, tool name translation, and error states.
- **Components** (`src/design-system/coach/`):
  - `TrinetraCoachLayout.tsx`: Responsive 2-column layout with mobile slide-over history drawer.
  - `TrinetraEmptyState.tsx`: Dark-first initial empty state with TRINETRA branding and 4 suggested prompt cards.
  - `TrinetraMessageList.tsx`: Formatted message bubbles with safe markdown rendering (`react-markdown`), token streaming indicators, and tool activity pills.
  - `TrinetraComposer.tsx`: Multiline textarea with auto-resize, character counter (up to 1000 chars), keyboard shortcuts (`Enter`/`Shift+Enter`), and send action button.
  - `TrinetraConversationList.tsx`: Conversation history sidebar displaying active selection, inline rename, and delete actions.
  - `DeleteConversationModal.tsx`: Confirmation modal before conversation deletion.
- **Page Component**: `src/v3/pages/V3CoachPage.tsx` connects state hook to design system layout primitives inside `MemberLayout` and `ProtectedRoute`.

## Route
`/v3/coach` *(Canonical TRINETRA Coach member route)*

## API Endpoints Used
- `POST /api/v1/ai/chat` (Accept: `text/event-stream` for POST-based SSE streaming and JSON fallback)
- `GET /api/v1/ai/conversations` (List user conversations)
- `GET /api/v1/ai/conversations/:id/messages` (Fetch message history for conversation)
- `PATCH /api/v1/ai/conversations/:id` (Rename conversation title)
- `DELETE /api/v1/ai/conversations/:id` (Delete conversation)

## Streaming Protocol
Frontend streams response tokens over HTTP POST via `fetch()` + `ReadableStream` through `coachApi.streamChat`. Handled event types:
- `token`: `{ token: string }` — Real-time text token fragment appended to assistant bubble.
- `tool_call`: `{ tool: string, args: any }` — Triggers user-friendly tool activity indicator (e.g. "Checking today's workout...").
- `tool_result`: `{ tool: string, result: any }` — Clears or updates active tool execution state.
- `done`: `{ message: string, conversationId: string, usage: any }` — Finalizes response content, binds conversation ID, and updates conversation list.
- `error`: `{ message: string, category: string }` — Handles rate limits, safety policy blocks, and network errors gracefully.

## Conversation History
Displays user conversations ordered by `updated_at` descending. Supports active session switching, "+ New Conversation" action, and background history preloading via `coachApi.listConversations()`.

## New Conversation
Tapping "+ New Conversation" clears active conversation state. When the user sends a message, a new conversation is created automatically on the backend and bound upon completion.

## Rename/Delete
- **Rename**: Users can inline-edit conversation titles directly from the history sidebar.
- **Delete**: Requires confirmation via `DeleteConversationModal` before invoking `coachApi.deleteConversation`.

## Tool Activity UX
Canonical 12 TRINETRA tools are mapped to clean, user-facing activity indicators:
- `get_today_workout` -> "Checking today's workout..."
- `get_progress` -> "Analyzing progress..."
- `get_nutrition` -> "Reviewing nutrition log..."
- `get_recovery` -> "Checking recovery status..."
- `log_water` -> "Logging water intake..."
- `log_meal` -> "Logging meal..."
- `create_workout` -> "Creating workout plan..."
- `update_goal` -> "Updating goal..."

Raw tool arguments, user UUIDs, organization UUIDs, database queries, and system prompts are never exposed to the user.

## Safety UX
Backend `SafetyPolicy` responses for high-risk or medical topics are rendered cleanly with cautious advice and professional referral language. Product identity is strictly presented as **"AI fitness guidance"** (never "AI doctor").

## Authentication
Protected by `ProtectedRoute` wrapping `MemberLayout`. User identity is rehydrated server-side from verified Supabase Auth JWTs.

## Member Privacy
Conversation records are isolated per authenticated `user_id`. No cross-tenant header injection or client-controlled user ID manipulation is trusted.

## Demo User
Respects Demo User access rules and restricts data persistence for unassigned guest identity.

## Files Created
- `src/features/coach/hooks/useTrinetraCoach.ts` — Custom hook for state, streaming, and conversation history.
- `src/design-system/coach/TrinetraEmptyState.tsx` — Empty state with TRINETRA identity and 4 suggested prompt cards.
- `src/design-system/coach/TrinetraMessageList.tsx` — Formatted message list with markdown and tool pills.
- `src/design-system/coach/TrinetraComposer.tsx` — Multiline composer with auto-resize and character limit.
- `src/design-system/coach/TrinetraConversationList.tsx` — Conversation sidebar list with active selection, rename, and delete actions.
- `src/design-system/coach/TrinetraCoachLayout.tsx` — Responsive desktop sidebar & mobile drawer layout.
- `src/design-system/coach/DeleteConversationModal.tsx` — Deletion confirmation dialog.
- `docs/STRIVA_V2_PHASE_7C_TRINETRA_COACH.md` — Phase 7C documentation and verification report.

## Files Modified
- `src/v3/pages/V3CoachPage.tsx` — Assembled complete TRINETRA Coach experience using `useTrinetraCoach` and design system primitives.
- `src/design-system/coach/index.ts` — Exported new TRINETRA Coach primitives.
- `src/design-system/icons.ts` — Re-exported `Loader2` and `MessageSquare` icons.
- `src/design-system/coach/CoachInput.tsx` — Replaced legacy "Trinity" string in placeholder with "TRINETRA".
- `backend/src/modules/ai/controllers/AIController.ts` — Appended streamed assistant response content to `ai_messages` table on stream completion.

## Files Deleted
NONE.

## Backend Changes
- Minimal non-breaking edit in `AIController.ts` to ensure streamed assistant response content appends to `ai_messages` on stream done, persisting conversation history for subsequent frontend requests.

## Database Changes
NONE. No database migrations, schema alterations, or RLS policy changes were introduced.

## Security Verification
- Zero user ID or organization ID injection in client requests.
- Rendered markdown sanitized by `react-markdown` (no raw HTML execution).
- Token counts, system prompts, API keys, and stack traces strictly omitted from error responses.

## Responsive Verification
Tested and verified viewports:
- Desktop: 1440px, 1280px
- Tablet: 1024px, 768px
- Mobile: 430px, 390px, 375px (mobile drawer toggle for conversation list, safe composer layout).

## Accessibility Verification
- Touch targets on suggested cards, action buttons, and conversation items exceed minimum 44px boundaries.
- Full keyboard support for message submission (`Enter` sends, `Shift+Enter` new line).
- Clear visual focus states and contrast compliance.

## Tests
- **Backend Tests**: 157 passed (14 test files).
- **Frontend Build**: Successful (2592 modules transformed, 0 errors).

## Builds
- **Backend Build (`npm run build:backend`)**: Successful (exit code 0).
- **Frontend Build (`npm run build:frontend`)**: Successful (exit code 0).

## Known Limitations
Full interactive workout execution, standalone nutrition tracking UI, and deep biometric progress charts are deferred to subsequent Phase 7 sub-phases (7D–7G).

## Scope Verification
Explicitly confirmed:
- 7D Workout NOT STARTED
- 7E Nutrition NOT STARTED
- 7F Progress NOT STARTED
- 7G Profile NOT STARTED
- 7H UX Verification NOT STARTED

PHASE 7C COMPLETE — TRINETRA COACH READY — PHASE 7D NOT STARTED
