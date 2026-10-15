-- ============================================================================
-- STRIVA V2: Phase 13B Foreign-Key Index Hardening
-- Migration: phase_13b_foreign_key_indexes.sql
-- Baseline: 28 -> 29
-- Description: Creates dependency-ordered, non-blocking indexes on canonical
--              STRIVA V2 active tables to eliminate sequential table scans
--              during parent deletions, cascade triggers, and frequent joins.
--
-- Safety & Runner Notes:
-- - Uses CREATE INDEX IF NOT EXISTS for strict idempotence.
-- - Compatible with transactional runner blocks (BEGIN ... COMMIT) with
--   transaction-level advisory locks.
-- - For zero-lock production deployment on large tables (>100k rows),
--   CREATE INDEX CONCURRENTLY may be executed outside a transaction block.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TIER 1: CRITICAL / HIGH-VOLUME CANONICAL V2 QUERY & CASCADE PATHS
-- ----------------------------------------------------------------------------

-- IDX-01: ai_messages (conversation_id, created_at ASC)
-- Supports: ai_messages_conversation_id_fkey -> ai_conversations(id) [ON DELETE CASCADE]
-- Covers: Conversation history retrieval (ORDER BY created_at ASC) & cascade delete
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id
  ON public.ai_messages (conversation_id, created_at ASC);

-- IDX-02: ai_tool_executions (conversation_id)
-- Supports: ai_tool_executions_conversation_id_fkey -> ai_conversations(id) [ON DELETE CASCADE]
-- Covers: Conversation tool call history replay & cascade delete
CREATE INDEX IF NOT EXISTS idx_ai_tool_executions_conversation_id
  ON public.ai_tool_executions (conversation_id);

-- IDX-03: organization_locations (organization_id)
-- Supports: organization_locations_organization_id_fkey -> organizations(id) [ON DELETE CASCADE]
-- Covers: Gym branch listing & tenant cascade deletion
CREATE INDEX IF NOT EXISTS idx_organization_locations_organization_id
  ON public.organization_locations (organization_id);

-- IDX-04: organization_roles (organization_id)
-- Supports: organization_roles_organization_id_fkey -> organizations(id) [ON DELETE CASCADE]
-- Covers: Custom tenant RBAC role resolution & tenant cascade deletion
CREATE INDEX IF NOT EXISTS idx_organization_roles_organization_id
  ON public.organization_roles (organization_id);

-- IDX-05: organization_audit_logs (organization_id, created_at DESC)
-- Supports: organization_audit_logs_organization_id_fkey -> organizations(id) [ON DELETE CASCADE]
-- Covers: Owner audit trail queries (ORDER BY created_at DESC) & tenant cascade deletion
CREATE INDEX IF NOT EXISTS idx_org_audit_logs_org_created
  ON public.organization_audit_logs (organization_id, created_at DESC);

-- IDX-06: trainer_member_assignments (member_user_id)
-- Supports: trainer_member_assignments_member_user_id_fkey -> profiles(id) [ON DELETE CASCADE]
-- Covers: Member profile cascade deletion & member-centric trainer lookups
CREATE INDEX IF NOT EXISTS idx_trainer_assignments_member_user_id
  ON public.trainer_member_assignments (member_user_id);

-- IDX-07: trainer_member_assignments (trainer_user_id)
-- Supports: trainer_member_assignments_trainer_user_id_fkey -> profiles(id) [ON DELETE CASCADE]
-- Covers: Trainer profile cascade deletion & trainer-centric assignment lookups
CREATE INDEX IF NOT EXISTS idx_trainer_assignments_trainer_user_id
  ON public.trainer_member_assignments (trainer_user_id);


-- ----------------------------------------------------------------------------
-- TIER 2: MEDIUM PRIORITY / RELATIONAL INTEGRITY ON BRANCH & BILLING
-- ----------------------------------------------------------------------------

-- IDX-08: attendance_logs (location_id)
-- Supports: attendance_logs_location_id_fkey -> organization_locations(id) [ON DELETE SET NULL]
-- Covers: Branch deletion SET NULL & location-filtered attendance queries
CREATE INDEX IF NOT EXISTS idx_attendance_logs_location_id
  ON public.attendance_logs (location_id)
  WHERE location_id IS NOT NULL;

-- IDX-09: organization_members (location_id)
-- Supports: organization_members_location_id_fkey -> organization_locations(id) [ON DELETE SET NULL]
-- Covers: Branch deletion SET NULL & member location filtering
CREATE INDEX IF NOT EXISTS idx_org_members_location_id
  ON public.organization_members (location_id)
  WHERE location_id IS NOT NULL;

-- IDX-10: organization_staff (location_id)
-- Supports: organization_staff_location_id_fkey -> organization_locations(id) [ON DELETE SET NULL]
-- Covers: Branch deletion SET NULL & staff location filtering
CREATE INDEX IF NOT EXISTS idx_org_staff_location_id
  ON public.organization_staff (location_id)
  WHERE location_id IS NOT NULL;

-- IDX-11: ai_tool_executions (user_id)
-- Supports: ai_tool_executions_user_id_fkey -> auth.users(id) [ON DELETE CASCADE]
-- Covers: User deletion cascade & user-level tool audit analytics
CREATE INDEX IF NOT EXISTS idx_ai_tool_executions_user_id
  ON public.ai_tool_executions (user_id);

-- IDX-12: ai_agent_memories (organization_id)
-- Supports: ai_agent_memories_organization_id_fkey -> organizations(id) [ON DELETE CASCADE]
-- Covers: Tenant deletion cascade on agent memories
CREATE INDEX IF NOT EXISTS idx_ai_agent_memories_organization_id
  ON public.ai_agent_memories (organization_id);

-- IDX-13: v2_workout_sessions (plan_id)
-- Supports: v2_workout_sessions_plan_id_fkey -> v2_workout_plans(id) [ON DELETE SET NULL]
-- Covers: Workout plan deletion SET NULL & session plan analytics
CREATE INDEX IF NOT EXISTS idx_v2_workout_sessions_plan_id
  ON public.v2_workout_sessions (plan_id)
  WHERE plan_id IS NOT NULL;

-- IDX-14: invoices (subscription_id)
-- Supports: invoices_subscription_id_fkey -> subscriptions(id) [ON DELETE SET NULL]
-- Covers: Consumer subscription deletion SET NULL & invoice subscription lookups
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id
  ON public.invoices (subscription_id)
  WHERE subscription_id IS NOT NULL;

-- IDX-15: organization_invoices (subscription_id)
-- Supports: organization_invoices_subscription_id_fkey -> organization_subscriptions(id) [ON DELETE SET NULL]
-- Covers: B2B subscription deletion SET NULL & organization invoice lookups
CREATE INDEX IF NOT EXISTS idx_org_invoices_subscription_id
  ON public.organization_invoices (subscription_id)
  WHERE subscription_id IS NOT NULL;

-- IDX-16: organization_subscriptions (plan_id)
-- Supports: organization_subscriptions_plan_id_fkey -> organization_subscription_plans(id) [ON DELETE SET NULL]
-- Covers: Plan configuration updates/deletions & subscription plan lookups
CREATE INDEX IF NOT EXISTS idx_org_subs_plan_id
  ON public.organization_subscriptions (plan_id)
  WHERE plan_id IS NOT NULL;
