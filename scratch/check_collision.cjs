const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/striva_restore_test'
});

const names = [
  'idx_ai_messages_conversation_id',
  'idx_ai_tool_executions_conversation_id',
  'idx_organization_locations_organization_id',
  'idx_organization_roles_organization_id',
  'idx_org_audit_logs_org_created',
  'idx_trainer_assignments_member_user_id',
  'idx_trainer_assignments_trainer_user_id',
  'idx_attendance_logs_location_id',
  'idx_org_members_location_id',
  'idx_org_staff_location_id',
  'idx_ai_tool_executions_user_id',
  'idx_ai_agent_memories_organization_id',
  'idx_v2_workout_sessions_plan_id',
  'idx_invoices_subscription_id',
  'idx_org_invoices_subscription_id',
  'idx_org_subs_plan_id'
];

async function check() {
  await client.connect();
  const res = await client.query('SELECT indexname FROM pg_indexes WHERE indexname = ANY($1)', [names]);
  console.log('Existing matching index names count:', res.rows.length, res.rows);
  await client.end();
}

check().catch(console.error);
