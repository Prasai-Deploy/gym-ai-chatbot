const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/striva_restore_test'
});

async function analyze() {
  await client.connect();

  const candidates = [
    { table: 'ai_messages', col: 'conversation_id' },
    { table: 'ai_tool_executions', col: 'conversation_id' },
    { table: 'ai_tool_executions', col: 'user_id' },
    { table: 'ai_agent_memories', col: 'organization_id' },
    { table: 'organization_locations', col: 'organization_id' },
    { table: 'organization_roles', col: 'organization_id' },
    { table: 'organization_audit_logs', col: 'organization_id' },
    { table: 'trainer_member_assignments', col: 'member_user_id' },
    { table: 'trainer_member_assignments', col: 'trainer_user_id' },
    { table: 'attendance_logs', col: 'location_id' },
    { table: 'organization_members', col: 'location_id' },
    { table: 'organization_staff', col: 'location_id' },
    { table: 'v2_workout_sessions', col: 'plan_id' },
    { table: 'invoices', col: 'subscription_id' },
    { table: 'organization_invoices', col: 'subscription_id' },
    { table: 'organization_subscriptions', col: 'plan_id' }
  ];

  const results = [];

  for (const c of candidates) {
    const colRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2;
    `, [c.table, c.col]);

    const fkRes = await client.query(`
      SELECT tc.constraint_name, ccu.table_name AS ref_table, ccu.column_name AS ref_col, rc.delete_rule, rc.update_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
      WHERE tc.table_schema = 'public' AND tc.table_name = $1 AND kcu.column_name = $2;
    `, [c.table, c.col]);

    const idxRes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = $1;
    `, [c.table]);

    results.push({
      table: c.table,
      col: c.col,
      dataType: colRes.rows[0]?.data_type,
      isNullable: colRes.rows[0]?.is_nullable === 'YES',
      constraint: fkRes.rows[0]?.constraint_name,
      refTable: fkRes.rows[0]?.ref_table,
      refCol: fkRes.rows[0]?.ref_col,
      deleteRule: fkRes.rows[0]?.delete_rule,
      updateRule: fkRes.rows[0]?.update_rule,
      indexes: idxRes.rows
    });
  }

  fs.writeFileSync('scratch/candidate_analysis.json', JSON.stringify(results, null, 2));
  console.log('Saved 16 candidates to scratch/candidate_analysis.json');

  await client.end();
}

analyze().catch((err) => {
  console.error(err);
  process.exit(1);
});
