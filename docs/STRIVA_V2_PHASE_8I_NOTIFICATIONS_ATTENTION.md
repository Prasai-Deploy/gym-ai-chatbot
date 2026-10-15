# STRIVA V2 — Phase 8I: Tenant Notifications & Attention System Architecture & Verification Report

**Document Version**: 1.0.0  
**Phase**: Phase 8I (Notifications & Attention System)  
**Status**: COMPLETE  
**Target Environment**: STRIVA V2 Gym Owner OS  

---

## 1. Executive Summary

Phase 8I delivers a secure, multi-tenant notifications and operational attention system for the STRIVA V2 Gym Owner OS. The system bridges real persisted database records across gym operations (B2B organization billing, member enrollment, trainer-member assignments, attendance logs, staff invitations, and facility locations) with deterministic event evaluation, strict PostgreSQL Row Level Security (RLS), and an accessible slide-over In-App Notification Center.

Mock notifications and placeholder data have been replaced in active flows. The system guarantees that billing alerts are strictly isolated from trainers, staff, and members, while preventing duplicate unread alerts on repeated dashboard loads or polling cycles through PostgreSQL partial unique indexes and deterministic deduplication keys.

---

## 2. Notification Database Schema

The database migration is versioned canonically at `backend/supabase/migrations/phase_8i_organization_notifications.sql`.

### Table: `public.organization_notifications`

| Column | Type | Constraints / Defaults | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique notification identifier |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | Strict tenant foreign key |
| `recipient_user_id` | `UUID` | `REFERENCES auth.users(id) ON DELETE CASCADE` | Optional specific recipient user |
| `recipient_role` | `VARCHAR(50)` | `DEFAULT 'Organization Owner'` | Authorized recipient role group |
| `type` | `VARCHAR(100)` | `NOT NULL` | Event classifier (e.g., `billing_past_due`, `trainer_unassigned_members`) |
| `severity` | `VARCHAR(20)` | `NOT NULL DEFAULT 'info' CHECK IN ('info', 'warning', 'critical')` | Priority classification |
| `title` | `VARCHAR(255)` | `NOT NULL` | Human-readable alert title |
| `message` | `TEXT` | `NOT NULL` | Detailed operational description |
| `resource_type` | `VARCHAR(100)` | `NULL` | Associated entity (`subscription`, `trainer`, `attendance`, `location`) |
| `resource_id` | `VARCHAR(255)` | `NULL` | ID of associated entity |
| `action_path` | `VARCHAR(255)` | `NULL` | Navigation target (`/owner/billing`, `/owner/trainers`, etc.) |
| `action_label` | `VARCHAR(100)` | `NULL` | Call-to-action button label |
| `is_read` | `BOOLEAN` | `NOT NULL DEFAULT false` | Read status |
| `read_at` | `TIMESTAMPTZ` | `NULL` | Timestamp of read transition |
| `deduplication_key` | `VARCHAR(255)` | `NULL` | Deterministic deduplication token |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'::jsonb` | Structured event context (e.g. counts, dates) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record update timestamp |

### Indexes & Deduplication Guarantee

```sql
CREATE INDEX idx_org_notifications_org ON public.organization_notifications(organization_id);
CREATE INDEX idx_org_notifications_recipient ON public.organization_notifications(recipient_user_id);
CREATE INDEX idx_org_notifications_role ON public.organization_notifications(organization_id, recipient_role);
CREATE INDEX idx_org_notifications_read ON public.organization_notifications(organization_id, is_read);
CREATE INDEX idx_org_notifications_created ON public.organization_notifications(created_at DESC);
CREATE INDEX idx_org_notifications_dedup ON public.organization_notifications(organization_id, deduplication_key);

-- Deterministic active deduplication: ensures an unread alert cannot be duplicated
CREATE UNIQUE INDEX uq_org_notifications_active_dedup 
ON public.organization_notifications(organization_id, deduplication_key) 
WHERE is_read = false AND deduplication_key IS NOT NULL;
```

---

## 3. Event Rules & Persisted Data Sources

All alerts and attention items evaluate real persisted data in STRIVA tables:

| Rule Name | Data Source | Triggering Condition | Severity | Recipient Role | Action Route | Deduplication Key Pattern |
|---|---|---|---|---|---|---|
| **B2B Subscription Past Due** | `organization_subscriptions` | `status = 'past_due'` | `critical` | Organization Owner | `/owner/billing` | `org:${orgId}:billing_past_due` |
| **B2B Subscription Setup Required** | `organization_subscriptions` | `status IN ('none', 'pending_checkout')` | `warning` | Organization Owner | `/owner/billing` | `org:${orgId}:billing_pending_setup` |
| **Unclosed Attendance Sessions** | `attendance_logs` | `status = 'active'` AND `check_out_time IS NULL` AND `check_in_time < NOW() - 8h` | `warning` | Gym Manager, Owner | `/owner/attendance` | `org:${orgId}:attendance_unclosed:${date}` |
| **Unassigned Active Members** | `organization_members` & `trainer_member_assignments` | Active members with no active trainer assignment | `warning` | Gym Manager, Owner | `/owner/trainers` | `org:${orgId}:trainer_unassigned_members` |
| **Pending Staff Invitations** | `organization_invitations` | `status = 'pending'` AND `expires_at > NOW()` | `info` | Gym Manager, Owner | `/owner/staff` | `org:${orgId}:staff_pending_invitations` |
| **Facility Setup — No Locations** | `organization_locations` | `COUNT(locations) = 0` | `warning` | Organization Owner | `/owner/settings` | `org:${orgId}:system_no_locations` |

---

## 4. Recipient Authorization & Role Matrix

| Endpoint / Capability | Platform Super Admin | Organization Owner | Gym Manager | Trainer / Front Desk | Member |
|---|---|---|---|---|---|
| **List Notifications (Operational)** | Allowed | Allowed | Allowed | Allowed (Scoped) | 403 Forbidden |
| **List Notifications (B2B Billing)** | Allowed | Allowed | Denied (Filtered Out) | Denied (Filtered Out) | 403 Forbidden |
| **Unread Notification Count** | Allowed | Allowed | Allowed (Operational Only) | Allowed (Operational Only) | 403 Forbidden |
| **Owner Attention Panel** | Allowed | Allowed | Allowed (Operational Only) | 403 Forbidden | 403 Forbidden |
| **Mark Single Notification Read** | Allowed | Allowed | Allowed (Own/Tenant) | Allowed (Own/Tenant non-billing) | 403 Forbidden |
| **Mark All Notifications Read** | Allowed | Allowed | Allowed (Own/Tenant) | Allowed (Own/Tenant non-billing) | 403 Forbidden |

---

## 5. Row Level Security & Multi-Tenant Isolation

PostgreSQL RLS ensures that notifications are fail-closed:
1. Direct check against verified user session `auth.uid()`.
2. Check against `organizations.owner_id = auth.uid()`.
3. Check against `organization_members.organization_id = organization_notifications.organization_id`:
   - Billing notifications (`type LIKE 'billing_%'`) are only visible if member role is `Organization Owner` or `Platform Super Admin`.
   - `Gym Manager`, `Trainer`, and `Front Desk` can never view cross-tenant rows or organization billing data.
4. Updates to read state are restricted to authorized recipients within the organization.

---

## 6. Deterministic Deduplication & Retention Policy

### Deduplication Strategy
- Whenever `NotificationService.evaluateOperationalEvents` executes, it computes a deterministic `deduplication_key`.
- `NotificationRepository.upsertDeduplicatedNotification` first inspects whether an unread record with `(organization_id, deduplication_key)` exists.
- If an unread record exists, the existing record is returned without inserting a duplicate.
- A concurrent race condition is guarded by the database partial unique index `uq_org_notifications_active_dedup`.
- Repeated dashboard renders and polling calls (every 30 seconds) do not inflate notification counts or table rows.

### Retention Policy
- Read notifications are preserved in `organization_notifications` with `is_read = true` and `read_at = TIMESTAMPTZ` to maintain an immutable operational audit log.
- Historical records are not silently deleted.
- Resolved conditions naturally disappear from the active Attention section once resolved in the primary entity tables (e.g., once an active membership or payment is reconciled), while preserving notification history.

---

## 7. API Contracts

All endpoints are prefixed under canonical `/api/v1/organizations/current/notifications`.

### 1. List Notifications
- **Route**: `GET /api/v1/organizations/current/notifications`
- **Query Parameters**:
  - `unread_only` (`boolean`, optional): Filter for unread notifications only.
  - `limit` (`number`, default: 20, max: 100): Page size.
  - `offset` (`number`, default: 0): Page offset.
- **Response**:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "organization_id": "uuid",
        "type": "billing_past_due",
        "severity": "critical",
        "title": "Subscription Payment Past Due",
        "message": "Your organization subscription payment has failed.",
        "action_path": "/owner/billing",
        "action_label": "Resolve Billing",
        "resource_type": "subscription",
        "is_read": false,
        "read_at": null,
        "deduplication_key": "org:uuid:billing_past_due",
        "created_at": "2026-10-09T08:00:00.000Z",
        "updated_at": "2026-10-09T08:00:00.000Z"
      }
    ],
    "total": 1,
    "unreadCount": 1
  }
}
```

### 2. Unread Notification Count
- **Route**: `GET /api/v1/organizations/current/notifications/unread-count`
- **Response**:
```json
{
  "success": true,
  "data": {
    "unreadCount": 1
  }
}
```

### 3. Owner Attention Summary
- **Route**: `GET /api/v1/organizations/current/notifications/attention`
- **Response**:
```json
{
  "success": true,
  "data": {
    "attentionItems": [
      {
        "id": "uuid",
        "severity": "critical",
        "title": "Subscription Payment Past Due",
        "message": "Your organization subscription payment has failed. Update billing credentials to prevent service interruption.",
        "actionPath": "/owner/billing",
        "actionLabel": "Resolve Billing",
        "resourceType": "subscription",
        "createdAt": "2026-10-09T08:00:00.000Z",
        "deduplicationKey": "org:uuid:billing_past_due"
      }
    ]
  }
}
```

### 4. Mark Notification as Read
- **Route**: `PATCH /api/v1/organizations/current/notifications/:id/read`
- **Response**:
```json
{
  "success": true,
  "data": {
    "notification": {
      "id": "uuid",
      "is_read": true,
      "read_at": "2026-10-09T08:05:00.000Z"
    }
  }
}
```

### 5. Mark All Notifications as Read
- **Route**: `POST /api/v1/organizations/current/notifications/mark-all-read`
- **Response**:
```json
{
  "success": true,
  "data": {
    "count": 1
  }
}
```

---

## 8. Verification & Test Suite Results

### Security & Unit Test Coverage (`phase8i_notifications_attention.security.test.ts`)
- **TEST 1**: Organization Owner lists tenant notifications including billing alerts.
- **TEST 2**: Platform Super Admin accesses organization notifications across tenants with authorized scope.
- **TEST 3**: Gym Manager receives operational alerts but NEVER billing notifications.
- **TEST 4**: Trainer views general notifications with billing alerts strictly filtered out.
- **TEST 5**: Trainer is denied access to the Owner Attention summary endpoint (`403 Forbidden`).
- **TEST 6**: Consumer Member is denied access to organization notifications (`403 Forbidden`).
- **TEST 7**: Demo User is denied access to organization notifications (`403 Forbidden`).
- **TEST 8**: Unauthenticated request is rejected (`401 Unauthorized`).
- **TEST 9**: Cross-tenant isolation prevents Rival Owner from viewing Titan Gym notifications.
- **TEST 10**: Rival Owner cannot mutate or mark Titan Gym notification as read (`404 Not Found`).
- **TEST 11**: Header spoofing with unauthorized `x-organization-id` is actively rejected (`403 Forbidden`).
- **TEST 12**: Owner marks unread notification as read (`is_read = true`, `read_at` updated).
- **TEST 13**: Trainer cannot mark billing notification as read (`403 Forbidden`).
- **TEST 14**: Marking all notifications as read updates all tenant unread records and zeroes unread count.
- **TEST 15**: Repeated evaluation does not create duplicate unread notifications (deduplication key integrity).
- **TEST 16**: Repeated polling of `/attention` returns deterministic prioritized items (Critical > Warning > Info).
- **TEST 17**: Invalid non-UUID notification ID returns `400 Bad Request` (`VALIDATION_ERROR`).
- **TEST 18**: Non-existent notification ID returns `404 Not Found`.
- **TEST 19**: Pagination bounds and validates `limit` and `offset`.
- **TEST 20**: Consumer billing status endpoint (`/api/v1/billing/status`) remains functional and untouched.

### Test Execution Summary
- **Total Test Files**: 29 passed (29 total)
- **Total Tests**: 448 passed (448 total)
- **Regressions**: 0 (preserved entire 428 baseline + 20 new Phase 8I tests)

### Build Verification
- **Frontend Production Build (`npm run build:frontend`)**: Built in 8.56s with Vite 6.4.3 without errors.
- **Backend TypeScript Compilation (`npm --prefix backend run build`)**: `tsc && tsc-alias` succeeded with 0 errors.

---

## 9. Live Database Verification Status

> [!NOTE]
> **Mock vs. Live Verification Clarification**:  
> All 448 automated tests were executed using mocked Supabase database clients in Vitest to guarantee reproducible CI/CD runs without external network dependencies.  
> The migration script `phase_8i_organization_notifications.sql` contains production DDL, constraints, partial unique indexes, and RLS policies ready to be applied directly to a live Supabase PostgreSQL cluster via Supabase CLI (`supabase migration up`).

---

## 10. Known Limitations

1. External Delivery Channels (SMS, WhatsApp, Push, Email) remain modular provider interfaces and are not activated for external delivery in this phase, adhering to the requirement that In-App notifications are the primary scope.
2. Real-time WebSocket Supabase Realtime subscriptions can be bound directly to `organization_notifications` in a future phase; TanStack Query polling (bounded at 30 seconds) is currently used.
3. TRINETRA-generated strategic business recommendations are explicitly excluded and deferred to Phase 8J.
