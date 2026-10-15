const { Client } = require('pg');
const fks = require('./unindexed_fks.json');

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/striva_restore_test'
});

async function run() {
  await client.connect();
  const uniqueTables = [...new Set(fks.map(r => r.table_name))];
  const res = await client.query(`
    SELECT
      c.relname AS table_name,
      s.n_live_tup AS live_tuples,
      pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
      pg_total_relation_size(c.oid) AS raw_bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
    WHERE n.nspname = 'public'
      AND c.relname = ANY($1)
    ORDER BY pg_total_relation_size(c.oid) DESC;
  `, [uniqueTables]);

  console.table(res.rows.map(r => ({
    table_name: r.table_name,
    live_tuples: r.live_tuples,
    total_size: r.total_size
  })));

  await client.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
