const { Client } = require('pg');

async function inspectIndexes() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/striva_restore_test'
  });

  try {
    await client.connect();

    const tables = [
      'organization_roles',
      'organization_audit_logs',
      'organization_staff',
      'organization_subscriptions',
      'organization_invoices',
      'organization_invitations',
      'v2_workout_sessions',
      'invoices',
      'recommendations',
      'user_goals',
      'user_milestones'
    ];

    for (const table of tables) {
      const res = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = $1
      `, [table]);
      console.log(`\nIndexes on ${table}:`);
      for (const row of res.rows) {
        console.log(`  - ${row.indexname}: ${row.indexdef}`);
      }
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

inspectIndexes();
