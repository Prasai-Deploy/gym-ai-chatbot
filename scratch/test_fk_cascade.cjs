const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/striva_restore_test'
});

async function testCascade() {
  await client.connect();
  try {
    await client.query('BEGIN');

    // Create partial index on attendance_logs (location_id) WHERE location_id IS NOT NULL
    await client.query('CREATE INDEX test_partial_idx ON attendance_logs (location_id) WHERE location_id IS NOT NULL');

    // Insert dummy organization
    const orgRes = await client.query(`
      INSERT INTO organizations (id, name, slug)
      VALUES ('11111111-1111-1111-1111-111111111111', 'Test Org', 'test-org-fk')
      RETURNING id
    `);

    // Insert dummy location
    const locRes = await client.query(`
      INSERT INTO organization_locations (id, organization_id, name)
      VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Branch 1')
      RETURNING id
    `);

    // Insert dummy attendance log
    await client.query(`
      INSERT INTO attendance_logs (id, organization_id, user_id, location_id, check_in_time)
      VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'b96c0b60-9a8b-496f-9e33-f533982412f6', '22222222-2222-2222-2222-222222222222', NOW())
    `);

    // Explain analyze delete of location!
    // We want to see how PostgreSQL updates attendance_logs (location_id)
    const explainDelete = await client.query(`
      EXPLAIN (ANALYZE, BUFFERS) DELETE FROM organization_locations WHERE id = '22222222-2222-2222-2222-222222222222'
    `);
    console.log('Delete explain:');
    console.log(explainDelete.rows.map(r => r['QUERY PLAN']).join('\n'));

    // Verify attendance_logs location_id was set to null
    const checkLog = await client.query(`SELECT location_id FROM attendance_logs WHERE id = '33333333-3333-3333-3333-333333333333'`);
    console.log('Attendance log location_id after delete:', checkLog.rows[0].location_id);

    await client.query('ROLLBACK');
    console.log('Cascade test rolled back clean.');
  } finally {
    await client.end();
  }
}

testCascade().catch((err) => {
  console.error(err);
  process.exit(1);
});
