const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const candidates = [
  { id: 'IDX-01', table: 'ai_messages', cols: 'conversation_id, created_at ASC', indexName: 'idx_ai_messages_conversation_id', fk: 'ai_messages_conversation_id_fkey' },
  { id: 'IDX-02', table: 'ai_tool_executions', cols: 'conversation_id', indexName: 'idx_ai_tool_executions_conversation_id', fk: 'ai_tool_executions_conversation_id_fkey' },
  { id: 'IDX-03', table: 'organization_locations', cols: 'organization_id', indexName: 'idx_organization_locations_organization_id', fk: 'organization_locations_organization_id_fkey' },
  { id: 'IDX-04', table: 'organization_roles', cols: 'organization_id', indexName: 'idx_organization_roles_organization_id', fk: 'organization_roles_organization_id_fkey' },
  { id: 'IDX-05', table: 'organization_audit_logs', cols: 'organization_id, created_at DESC', indexName: 'idx_org_audit_logs_org_created', fk: 'organization_audit_logs_organization_id_fkey' },
  { id: 'IDX-06', table: 'trainer_member_assignments', cols: 'member_user_id', indexName: 'idx_trainer_assignments_member_user_id', fk: 'trainer_member_assignments_member_user_id_fkey' },
  { id: 'IDX-07', table: 'trainer_member_assignments', cols: 'trainer_user_id', indexName: 'idx_trainer_assignments_trainer_user_id', fk: 'trainer_member_assignments_trainer_user_id_fkey' },
  { id: 'IDX-08', table: 'attendance_logs', cols: 'location_id', indexName: 'idx_attendance_logs_location_id', fk: 'attendance_logs_location_id_fkey' },
  { id: 'IDX-09', table: 'organization_members', cols: 'location_id', indexName: 'idx_org_members_location_id', fk: 'organization_members_location_id_fkey' },
  { id: 'IDX-10', table: 'organization_staff', cols: 'location_id', indexName: 'idx_org_staff_location_id', fk: 'organization_staff_location_id_fkey' },
  { id: 'IDX-11', table: 'ai_tool_executions', cols: 'user_id', indexName: 'idx_ai_tool_executions_user_id', fk: 'ai_tool_executions_user_id_fkey' },
  { id: 'IDX-12', table: 'ai_agent_memories', cols: 'organization_id', indexName: 'idx_ai_agent_memories_organization_id', fk: 'ai_agent_memories_organization_id_fkey' },
  { id: 'IDX-13', table: 'v2_workout_sessions', cols: 'plan_id', indexName: 'idx_v2_workout_sessions_plan_id', fk: 'v2_workout_sessions_plan_id_fkey' },
  { id: 'IDX-14', table: 'invoices', cols: 'subscription_id', indexName: 'idx_invoices_subscription_id', fk: 'invoices_subscription_id_fkey' },
  { id: 'IDX-15', table: 'organization_invoices', cols: 'subscription_id', indexName: 'idx_org_invoices_subscription_id', fk: 'organization_invoices_subscription_id_fkey' },
  { id: 'IDX-16', table: 'organization_subscriptions', cols: 'plan_id', indexName: 'idx_org_subs_plan_id', fk: 'organization_subscriptions_plan_id_fkey' }
];

async function verifyAllFks() {
  await client.connect();

  console.log('=== VERIFYING ALL 16 FOREIGN KEYS ON STAGING VIA PG_CONSTRAINT ===\n');

  for (const c of candidates) {
    const res = await client.query(`
      SELECT
        c.conname AS constraint_name,
        cl.relname AS table_name,
        confrelid::regclass::text AS ref_table,
        pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
      JOIN pg_class cl ON cl.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public'
        AND cl.relname = $1
        AND c.conname = $2;
    `, [c.table, c.fk]);

    if (res.rows.length === 1) {
      console.log(`✓ [${c.id}] ${c.table}.${c.cols} -> ${res.rows[0].def}`);
    } else {
      console.error(`✗ [${c.id}] FAILED TO FIND CONSTRAINT ${c.fk} on table ${c.table}!`);
    }
  }

  await client.end();
}

verifyAllFks().catch(console.error);
