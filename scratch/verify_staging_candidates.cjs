const fs = require('fs');

const audit = JSON.parse(fs.readFileSync('scratch/staging_audit_data.json', 'utf-8'));

const candidates = [
  { id: 'IDX-01', table: 'ai_messages', cols: 'conversation_id, created_at ASC', indexName: 'idx_ai_messages_conversation_id', fk: 'ai_messages_conversation_id_fkey', isPartial: false },
  { id: 'IDX-02', table: 'ai_tool_executions', cols: 'conversation_id', indexName: 'idx_ai_tool_executions_conversation_id', fk: 'ai_tool_executions_conversation_id_fkey', isPartial: false },
  { id: 'IDX-03', table: 'organization_locations', cols: 'organization_id', indexName: 'idx_organization_locations_organization_id', fk: 'organization_locations_organization_id_fkey', isPartial: false },
  { id: 'IDX-04', table: 'organization_roles', cols: 'organization_id', indexName: 'idx_organization_roles_organization_id', fk: 'organization_roles_organization_id_fkey', isPartial: false },
  { id: 'IDX-05', table: 'organization_audit_logs', cols: 'organization_id, created_at DESC', indexName: 'idx_org_audit_logs_org_created', fk: 'organization_audit_logs_organization_id_fkey', isPartial: false },
  { id: 'IDX-06', table: 'trainer_member_assignments', cols: 'member_user_id', indexName: 'idx_trainer_assignments_member_user_id', fk: 'trainer_member_assignments_member_user_id_fkey', isPartial: false },
  { id: 'IDX-07', table: 'trainer_member_assignments', cols: 'trainer_user_id', indexName: 'idx_trainer_assignments_trainer_user_id', fk: 'trainer_member_assignments_trainer_user_id_fkey', isPartial: false },
  { id: 'IDX-08', table: 'attendance_logs', cols: 'location_id', indexName: 'idx_attendance_logs_location_id', fk: 'attendance_logs_location_id_fkey', isPartial: true, predicate: 'WHERE location_id IS NOT NULL' },
  { id: 'IDX-09', table: 'organization_members', cols: 'location_id', indexName: 'idx_org_members_location_id', fk: 'organization_members_location_id_fkey', isPartial: true, predicate: 'WHERE location_id IS NOT NULL' },
  { id: 'IDX-10', table: 'organization_staff', cols: 'location_id', indexName: 'idx_org_staff_location_id', fk: 'organization_staff_location_id_fkey', isPartial: true, predicate: 'WHERE location_id IS NOT NULL' },
  { id: 'IDX-11', table: 'ai_tool_executions', cols: 'user_id', indexName: 'idx_ai_tool_executions_user_id', fk: 'ai_tool_executions_user_id_fkey', isPartial: false },
  { id: 'IDX-12', table: 'ai_agent_memories', cols: 'organization_id', indexName: 'idx_ai_agent_memories_organization_id', fk: 'ai_agent_memories_organization_id_fkey', isPartial: false },
  { id: 'IDX-13', table: 'v2_workout_sessions', cols: 'plan_id', indexName: 'idx_v2_workout_sessions_plan_id', fk: 'v2_workout_sessions_plan_id_fkey', isPartial: true, predicate: 'WHERE plan_id IS NOT NULL' },
  { id: 'IDX-14', table: 'invoices', cols: 'subscription_id', indexName: 'idx_invoices_subscription_id', fk: 'invoices_subscription_id_fkey', isPartial: true, predicate: 'WHERE subscription_id IS NOT NULL' },
  { id: 'IDX-15', table: 'organization_invoices', cols: 'subscription_id', indexName: 'idx_org_invoices_subscription_id', fk: 'organization_invoices_subscription_id_fkey', isPartial: true, predicate: 'WHERE subscription_id IS NOT NULL' },
  { id: 'IDX-16', table: 'organization_subscriptions', cols: 'plan_id', indexName: 'idx_org_subs_plan_id', fk: 'organization_subscriptions_plan_id_fkey', isPartial: true, predicate: 'WHERE plan_id IS NOT NULL' }
];

console.log('=== CANDIDATE CROSS-CHECK ON STAGING CATALOG ===\n');

for (const c of candidates) {
  const fkMatch = audit.fkConstraints.find(f => f.table_name === c.table && f.constraint_name === c.fk);
  const existingOnTable = audit.existingIndexes.filter(i => i.tablename === c.table);
  const tableStat = audit.tableStats.find(s => s.table_name === c.table);

  console.log(`[${c.id}] Table: ${c.table}`);
  console.log(`  Proposed Index: ${c.indexName} (${c.cols}) ${c.predicate || ''}`);
  if (fkMatch) {
    console.log(`  FK Constraint: ${fkMatch.constraint_name} -> ${fkMatch.ref_schema}.${fkMatch.ref_table}(${fkMatch.ref_col}) [ON DELETE ${fkMatch.delete_rule}]`);
  } else {
    console.log(`  WARNING: FK Constraint ${c.fk} NOT FOUND ON STAGING!`);
  }
  console.log(`  Existing Indexes on table (${existingOnTable.length}):`);
  existingOnTable.forEach(i => console.log(`    - ${i.indexname}: ${i.indexdef}`));
  console.log(`  Staging Size: ${tableStat?.total_size || 'N/A'} (${tableStat?.live_tuples || 0} live rows)`);
  console.log('--------------------------------------------------');
}
