const { Client } = require('pg');

async function inspectForeignKeys() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/striva_restore_test'
  });

  try {
    await client.connect();

    // Query unindexed foreign keys along with update/delete cascade actions
    const query = `
      WITH fk_actions AS (
        SELECT
          c.conname AS constraint_name,
          n.nspname AS schema_name,
          cl.relname AS table_name,
          confcl.relname AS foreign_table_name,
          c.confupdtype AS update_action,
          c.confdeltype AS delete_action,
          ARRAY_AGG(att.attname ORDER BY u.attposition) AS fk_columns,
          ARRAY_AGG(att.attnum ORDER BY u.attposition) AS fk_column_ids,
          cl.oid AS table_oid
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_class cl ON cl.oid = c.conrelid
        JOIN pg_class confcl ON confcl.oid = c.confrelid
        JOIN LATERAL UNNEST(c.conkey) WITH ORDINALITY AS u(attnum, attposition) ON TRUE
        JOIN pg_attribute att ON att.attrelid = c.conrelid AND att.attnum = u.attnum
        WHERE c.contype = 'f' AND n.nspname = 'public'
        GROUP BY c.conname, n.nspname, cl.relname, confcl.relname, c.confupdtype, c.confdeltype, cl.oid
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
        f.delete_action,
        f.update_action
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
    console.log(`Found ${res.rows.length} unindexed foreign keys:`);
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error('Error querying catalog:', err);
  } finally {
    await client.end();
  }
}

inspectForeignKeys();
