const { Client } = require('pg');
const fs = require('fs');

const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/striva_restore_test' });

async function run() {
  await client.connect();
  const query = `
    WITH fk_actions AS (
      SELECT
        c.conname AS constraint_name,
        n.nspname AS schema_name,
        cl.relname AS table_name,
        c.confrelid::regclass::text AS foreign_table_name,
        c.confdeltype AS delete_action_code,
        c.confupdtype AS update_action_code,
        ARRAY_AGG(att.attname ORDER BY u.attposition) AS fk_columns,
        ARRAY_AGG(att.attnum ORDER BY u.attposition) AS fk_column_ids,
        cl.oid AS table_oid
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      JOIN pg_class cl ON cl.oid = c.conrelid
      JOIN LATERAL UNNEST(c.conkey) WITH ORDINALITY AS u(attnum, attposition) ON TRUE
      JOIN pg_attribute att ON att.attrelid = c.conrelid AND att.attnum = u.attnum
      WHERE c.contype = 'f' AND n.nspname = 'public'
      GROUP BY c.conname, n.nspname, cl.relname, c.confrelid, c.confdeltype, c.confupdtype, cl.oid
    ),
    indexed_columns AS (
      SELECT
        i.indrelid AS table_oid,
        ARRAY_AGG(att.attname ORDER BY u.attposition) AS indexed_column_names,
        ARRAY_AGG(u.attnum ORDER BY u.attposition) AS indexed_column_ids
      FROM pg_index i
      JOIN LATERAL UNNEST(i.indkey) WITH ORDINALITY AS u(attnum, attposition) ON TRUE
      JOIN pg_attribute att ON att.attrelid = i.indrelid AND att.attnum = u.attnum
      WHERE u.attnum > 0
      GROUP BY i.indexrelid, i.indrelid
    )
    SELECT
      f.table_name,
      f.constraint_name,
      f.fk_columns,
      f.foreign_table_name,
      CASE f.delete_action_code
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
        ELSE f.delete_action_code::text
      END AS delete_rule,
      CASE f.update_action_code
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
        ELSE f.update_action_code::text
      END AS update_rule
    FROM fk_actions f
    WHERE NOT EXISTS (
      SELECT 1
      FROM indexed_columns ic
      WHERE ic.table_oid = f.table_oid
        AND ic.indexed_column_ids[1:CARDINALITY(f.fk_column_ids)] = f.fk_column_ids
    )
    ORDER BY f.table_name, f.constraint_name;
  `;
  const res = await client.query(query);
  console.log('Total unindexed FK count:', res.rows.length);
  fs.writeFileSync('scratch/unindexed_fks.json', JSON.stringify(res.rows, null, 2));
  console.log('Saved to scratch/unindexed_fks.json');

  // Let's also group by table and print summary
  const byTable = {};
  for (const row of res.rows) {
    if (!byTable[row.table_name]) byTable[row.table_name] = [];
    byTable[row.table_name].push(row);
  }
  console.log(`Unique child tables: ${Object.keys(byTable).length}`);

  await client.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
