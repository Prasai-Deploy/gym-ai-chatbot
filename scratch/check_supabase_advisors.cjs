const { Client } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

async function checkAdvisors() {
  console.log('=== STRIVA V2 STAGING: SUPABASE SECURITY & PERFORMANCE ADVISOR INSPECTION ===');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log('\n--- 1. SECURITY ADVISOR: TABLES WITH RLS DISABLED ---');
  const rlsDisabled = await client.query(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = false
    ORDER BY tablename
  `);
  console.log(`Found ${rlsDisabled.rows.length} public tables with RLS disabled:`);
  console.table(rlsDisabled.rows);

  console.log('\n--- 2. SECURITY ADVISOR: TABLES WITH RLS ENABLED BUT 0 POLICIES ---');
  const rlsNoPolicies = await client.query(`
    SELECT t.tablename
    FROM pg_tables t
    LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
    WHERE t.schemaname = 'public'
      AND t.rowsecurity = true
    GROUP BY t.tablename
    HAVING COUNT(p.policyname) = 0
    ORDER BY t.tablename
  `);
  console.log(`Found ${rlsNoPolicies.rows.length} tables with RLS enabled but NO policies (fail-closed):`);
  console.table(rlsNoPolicies.rows);

  console.log('\n--- 3. SECURITY ADVISOR: FUNCTIONS WITHOUT PINNED SEARCH_PATH ---');
  const unpinnedFuncs = await client.query(`
    SELECT p.proname,
           pg_get_function_identity_arguments(p.oid) as args,
           p.prosecdef,
           p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (p.proconfig IS NULL OR NOT ('search_path=pg_catalog, pg_temp' = ANY(p.proconfig)))
    ORDER BY p.proname
  `);
  console.log(`Found ${unpinnedFuncs.rows.length} public functions without 'search_path=pg_catalog, pg_temp':`);
  console.table(unpinnedFuncs.rows);

  console.log('\n--- 4. PERFORMANCE ADVISOR: UNINDEXED FOREIGN KEYS ---');
  const unindexedFks = await client.query(`
    WITH fk_actions AS (
      SELECT
        c.conname AS constraint_name,
        n.nspname AS schema_name,
        cl.relname AS table_name,
        ARRAY_AGG(att.attname ORDER BY u.attposition) AS fk_columns,
        ARRAY_AGG(att.attnum ORDER BY u.attposition) AS fk_column_ids,
        cl.oid AS table_oid
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      JOIN pg_class cl ON cl.oid = c.conrelid
      JOIN LATERAL UNNEST(c.conkey) WITH ORDINALITY AS u(attnum, attposition) ON TRUE
      JOIN pg_attribute att ON att.attrelid = c.conrelid AND att.attnum = u.attnum
      WHERE c.contype = 'f' AND n.nspname = 'public'
      GROUP BY c.conname, n.nspname, cl.relname, cl.oid
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
      f.fk_columns
    FROM fk_actions f
    WHERE NOT EXISTS (
      SELECT 1
      FROM indexed_columns ic
      WHERE ic.table_oid = f.table_oid
        AND ic.indexed_column_ids[1:CARDINALITY(f.fk_column_ids)] = f.fk_column_ids
    )
    ORDER BY f.table_name, f.constraint_name;
  `);
  console.log(`Found ${unindexedFks.rows.length} foreign keys lacking leading index columns:`);
  console.table(unindexedFks.rows);

  console.log('\n--- 5. PERFORMANCE ADVISOR: UNUSED INDEXES ---');
  const unusedIndexes = await client.query(`
    SELECT
      schemaname,
      relname AS tablename,
      indexrelname AS indexname,
      idx_scan,
      pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
      AND idx_scan = 0
      AND NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conindid = indexrelid AND contype IN ('p', 'u')
      )
    ORDER BY pg_relation_size(indexrelid) DESC
    LIMIT 15;
  `);
  console.log(`Found ${unusedIndexes.rows.length} unconstrained indexes with idx_scan = 0:`);
  console.table(unusedIndexes.rows);

  console.log('\n--- 6. SECURITY ADVISOR: MULTIPLE PERMISSIVE POLICIES ON SAME TABLE/ROLE ---');
  const multiPolicies = await client.query(`
    SELECT
      schemaname,
      tablename,
      roles,
      cmd,
      COUNT(*) AS policy_count,
      ARRAY_AGG(policyname) AS policy_names
    FROM pg_policies
    WHERE schemaname = 'public'
      AND permissive = 'PERMISSIVE'
    GROUP BY schemaname, tablename, roles, cmd
    HAVING COUNT(*) > 1
    ORDER BY tablename, cmd;
  `);
  console.log(`Found ${multiPolicies.rows.length} combinations of multiple permissive policies:`);
  console.table(multiPolicies.rows);

  await client.end();
}

checkAdvisors().catch(console.error);
