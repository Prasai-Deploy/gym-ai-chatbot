const { Client } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

async function check() {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  console.log('--- 1. RLS DISABLED TABLES ---');
  const rls = await c.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false ORDER BY tablename");
  console.log('Count:', rls.rows.length);
  rls.rows.forEach(r => console.log('  -', r.tablename));

  console.log('\n--- 2. RLS ENABLED WITH 0 POLICIES ---');
  const noPol = await c.query("SELECT t.tablename FROM pg_tables t LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename WHERE t.schemaname = 'public' AND t.rowsecurity = true GROUP BY t.tablename HAVING COUNT(p.policyname) = 0 ORDER BY t.tablename");
  console.log('Count:', noPol.rows.length);
  noPol.rows.forEach(r => console.log('  -', r.tablename));

  console.log('\n--- 3. UNPINNED SEARCH_PATH FUNCTIONS ---');
  const unpinned = await c.query("SELECT p.proname, p.prosecdef, p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND (p.proconfig IS NULL OR NOT ('search_path=pg_catalog, pg_temp' = ANY(p.proconfig))) ORDER BY p.proname");
  console.log('Count:', unpinned.rows.length);
  unpinned.rows.forEach(r => console.log('  -', r.proname, '(secdef:', r.prosecdef, ', config:', r.proconfig, ')'));

  await c.end();
}
check().catch(console.error);
