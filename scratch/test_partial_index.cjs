const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/striva_restore_test'
});

async function test() {
  await client.connect();
  try {
    await client.query('BEGIN');

    // Create partial index on attendance_logs (location_id) WHERE location_id IS NOT NULL
    await client.query('CREATE INDEX test_partial_idx ON attendance_logs (location_id) WHERE location_id IS NOT NULL');

    // Force index scan to test plan
    await client.query('SET enable_seqscan = off');

    const explain = await client.query(`
      EXPLAIN SELECT 1 FROM attendance_logs WHERE location_id = '00000000-0000-0000-0000-000000000001'
    `);
    console.log('Query explain with enable_seqscan = off:');
    console.log(explain.rows.map(r => r['QUERY PLAN']).join('\n'));

    // Test what advisor query does:
    // Does the standard advisor check `i.indpred IS NULL`?
    const advisorCheck = await client.query(`
      WITH fk_actions AS (
        SELECT
          c.conname AS constraint_name,
          cl.relname AS table_name,
          ARRAY_AGG(att.attnum ORDER BY u.attposition) AS fk_column_ids,
          cl.oid AS table_oid
        FROM pg_constraint c
        JOIN pg_class cl ON cl.oid = c.conrelid
        JOIN LATERAL UNNEST(c.conkey) WITH ORDINALITY AS u(attnum, attposition) ON TRUE
        JOIN pg_attribute att ON att.attrelid = c.conrelid AND att.attnum = u.attnum
        WHERE c.conname = 'attendance_logs_location_id_fkey'
        GROUP BY c.conname, cl.relname, cl.oid
      ),
      indexed_columns AS (
        SELECT
          i.indrelid AS table_oid,
          i.indisvalid,
          i.indpred IS NOT NULL AS is_partial,
          ARRAY_AGG(u.attnum ORDER BY u.attposition) AS indexed_column_ids
        FROM pg_index i
        JOIN LATERAL UNNEST(i.indkey) WITH ORDINALITY AS u(attnum, attposition) ON TRUE
        WHERE u.attnum > 0
        GROUP BY i.indexrelid, i.indrelid, i.indisvalid, i.indpred
      )
      SELECT
        f.constraint_name,
        ic.is_partial
      FROM fk_actions f
      JOIN indexed_columns ic ON ic.table_oid = f.table_oid
        AND ic.indexed_column_ids[1:CARDINALITY(f.fk_column_ids)] = f.fk_column_ids;
    `);
    console.log('Advisor match for partial index:', advisorCheck.rows);

    await client.query('ROLLBACK');
    console.log('Rolled back test successfully.');
  } finally {
    await client.end();
  }
}

test().catch((err) => {
  console.error(err);
  process.exit(1);
});
