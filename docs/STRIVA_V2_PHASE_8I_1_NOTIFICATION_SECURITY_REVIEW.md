# STRIVA V2 — Phase 8I.1: Notification Access & Security Review Report

**Document Version**: 1.0.0  
**Audit Target**: Phase 8I Notification & Attention System  
**Status**: COMPLETE  
**Review Decision**: NOTIFICATION ACCESS REVIEW PASSED  

---

## 1. Executive Summary

During the Phase 8I post-implementation security audit, two key operational concerns were investigated and resolved:

1. **Shared Notification Read State Collision**:
   - **Finding**: In the initial design, read state was tracked solely via a single `is_read` column on `public.organization_notifications`. When notifications targeted a role (e.g. `Gym Manager` or `Organization Owner`), one user marking a shared notification as read would cause it to be marked as read for all users sharing that role in the organization.
   - **Fix**: Implemented recipient-specific normalized read tracking via `public.organization_notification_reads`. Unread counts, list pagination, mark-read, and mark-all-read operations now operate strictly per authenticated recipient user.

2. **Action Destination Route Validation**:
   - **Finding**: Certain notifications and attention items targeted routes that were not canonical implemented routes in STRIVA V2 (e.g., `/owner/staff` and `/owner/settings` which are roadmap/un-implemented).
   - **Fix**: Validated all notification action destinations. Replaced `/owner/staff` with the canonical `/owner/members` route, and converted facility setup alerts to honest non-clickable notifications (`action_path: undefined`). Furthermore, updated both frontend components (`NotificationDrawer.tsx` and `OwnerAttentionSection.tsx`) to validate action destinations against canonical implemented routes before rendering action CTAs or triggering navigation.

---

## 2. Recipient-Specific Read State Architecture

### Additive Migration: `backend/supabase/migrations/phase_8i_1_recipient_read_state.sql`

```sql
CREATE TABLE IF NOT EXISTS public.organization_notification_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.organization_notifications(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_notification_user_read UNIQUE (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_notif_reads_user ON public.organization_notification_reads(user_id, notification_id);
CREATE INDEX IF NOT EXISTS idx_org_notif_reads_org ON public.organization_notification_reads(organization_id, user_id);

ALTER TABLE public.organization_notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notification read state" 
ON public.organization_notification_reads
FOR SELECT USING (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = organization_notification_reads.organization_id
          AND om.user_id = auth.uid()
    )
);

CREATE POLICY "Users mark notifications read for themselves" 
ON public.organization_notification_reads
FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = organization_notification_reads.organization_id
          AND om.user_id = auth.uid()
    )
);
```

### Recipient-Specific Semantics
- **Notification Querying**: When user $U$ queries notifications for organization $O$, the repository fetches tenant notifications and maps each item's read status against $U$'s records in `organization_notification_reads`.
- **Unread Counts**: Evaluated as total authorized notifications for caller's role minus notifications read by $U$.
- **Mark Single As Read**: Inserts $(notification\_id, organization\_id, user\_id, read\_at)$ into `organization_notification_reads`. Does NOT alter read state for any other user in the tenant.
- **Mark All As Read**: Inserts read records for all currently unread notifications specifically for user $U$.
- **Deduplication Preserved**: The canonical alert record in `organization_notifications` remains deduplicated by $(organization\_id, deduplication\_key)$, ensuring repeated polls never create duplicate alert entries while maintaining independent user read tracking.

---

## 3. Action Destination Validation & Role Authorization Matrix

Canonical implemented Gym Owner routes:
- `/owner/dashboard`
- `/owner/members`
- `/owner/attendance`
- `/owner/trainers`
- `/owner/analytics`
- `/owner/billing`

### Operational Rule Destination Audit

| Rule | Evaluated Entity | Severity | Recipient Role | Canonical Destination | Action Label | Status |
|---|---|---|---|---|---|---|
| **B2B Subscription Past Due** | `organization_subscriptions` | `critical` | Organization Owner | `/owner/billing` | Resolve Billing | Authorized & Implemented |
| **B2B Subscription Setup Required** | `organization_subscriptions` | `warning` | Organization Owner | `/owner/billing` | Configure Plan | Authorized & Implemented |
| **Unclosed Attendance Sessions** | `attendance_logs` | `warning` | Gym Manager, Owner | `/owner/attendance` | Review Attendance | Authorized & Implemented |
| **Unassigned Active Members** | `trainer_member_assignments` | `warning` | Gym Manager, Owner | `/owner/trainers` | Assign Trainers | Authorized & Implemented |
| **Pending Staff Invitations** | `organization_invitations` | `info` | Gym Manager, Owner | `/owner/members` | View Members | Updated from `/owner/staff` to `/owner/members` |
| **Facility Setup — No Locations** | `organization_locations` | `warning` | Organization Owner | `null` (Non-clickable) | `null` | Updated from `/owner/settings` to Non-clickable |

### Frontend Destination Guarding
Both [`NotificationDrawer.tsx`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/features/owner/components/notifications/NotificationDrawer.tsx) and [`OwnerAttentionSection.tsx`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/features/owner/components/OwnerAttentionSection.tsx) now enforce `VALID_OWNER_DESTINATIONS`:
```typescript
const VALID_OWNER_DESTINATIONS = new Set([
  '/owner/dashboard',
  '/owner/members',
  '/owner/attendance',
  '/owner/trainers',
  '/owner/analytics',
  '/owner/billing',
]);
```
CTA buttons and links are rendered only when `action_path` exists within `VALID_OWNER_DESTINATIONS`.

---

## 4. Files Changed

1. **[`backend/supabase/migrations/phase_8i_1_recipient_read_state.sql`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/supabase/migrations/phase_8i_1_recipient_read_state.sql)**:
   - Created additive migration for `organization_notification_reads` with indexes and RLS policies.
2. **[`backend/src/modules/notification/notification.repository.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/src/modules/notification/notification.repository.ts)**:
   - Updated `listNotifications`, `getUnreadCount`, `markAsRead`, and `markAllAsRead` to enforce recipient-specific read records via `organization_notification_reads`.
3. **[`backend/src/modules/notification/notification.service.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/src/modules/notification/notification.service.ts)**:
   - Passed `userId` to `repository.markAsRead`.
   - Updated action path for staff invitations to `/owner/members`.
   - Converted missing facility location alert to honest non-clickable warning (`action_path: undefined`).
4. **[`src/features/owner/components/notifications/NotificationDrawer.tsx`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/features/owner/components/notifications/NotificationDrawer.tsx)**:
   - Added destination validation preventing navigation or rendering links to un-implemented routes.
5. **[`src/features/owner/components/OwnerAttentionSection.tsx`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/src/features/owner/components/OwnerAttentionSection.tsx)**:
   - Added destination validation preventing CTA buttons on non-implemented routes.
6. **[`backend/tests/security/phase8i_notifications_attention.security.test.ts`](file:///c:/Users/priyanashu/Downloads/CHATBOT_PROJECT/backend/tests/security/phase8i_notifications_attention.security.test.ts)**:
   - Added `TEST 21`: Verifies two authorized recipients read a shared notification independently.
   - Added `TEST 22`: Verifies every notification CTA points to an implemented route authorized for recipient role.

---

## 5. Verification Results

### Vitest Security & Unit Suite
```
Test Files  29 passed (29)
     Tests  450 passed (450)
  Duration  8.63s
```
- Preserved baseline: 428 tests.
- Phase 8I tests: 20 tests.
- Phase 8I.1 security audit tests added: 2 tests (`TEST 21`, `TEST 22`).
- Total passing tests: 450.
- Regressions: 0.

### Build Verification
- **Frontend Production Build (`npm run build:frontend`)**: Vite v6.4.3 production build succeeded in 5.42s with 0 errors.
- **Backend Production Build (`npm --prefix backend run build`)**: `tsc && tsc-alias` succeeded with 0 errors.

---

## 6. Live Database Verification Status

> [!NOTE]
> Automated tests were executed using mocked Supabase database clients to ensure reproducible CI/CD execution without external network dependencies.
> Live Supabase verification remains pending until migrations `phase_8i_organization_notifications.sql` and `phase_8i_1_recipient_read_state.sql` are applied directly to the live Supabase PostgreSQL cluster via Supabase CLI (`supabase migration up`).

---

## 7. Remaining Risks & Mitigations

1. **Table Volume for `organization_notification_reads`**: As staff members grow, read rows scale as $O(users \times notifications)$.
   - *Mitigation*: Indexed on `(user_id, notification_id)` and foreign-keyed with `ON DELETE CASCADE` when parent notifications are purged.
2. **WebSocket Realtime Subscriptions**: Push updates currently use 30-second TanStack Query polling.
   - *Mitigation*: Direct Supabase Realtime channel subscriptions can be added seamlessly in a future phase if instant cross-tab updates are required.
