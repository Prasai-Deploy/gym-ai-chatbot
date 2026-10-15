const path = require('path');
const dotenv = require(path.join(process.cwd(), 'node_modules', 'dotenv'));
const { Client } = require(path.join(process.cwd(), 'node_modules', 'pg'));

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function auditCatalog() {
  await client.connect();
  console.log('=== STRIVA V2 — DB-5M LIVE CATALOG SECURITY AUDIT ===\n');

  // 1. RLS-enabled tables without policies
  console.log('[1. RLS-ENABLED TABLES WITHOUT POLICIES]');
  const rlsNoPolicy = await client.query(`
    SELECT 
      c.relname as table_name,
      c.relrowsecurity as rls_enabled,
      c.relforcerowsecurity as rls_forced,
      count(p.polname) as policy_count
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    LEFT JOIN pg_policy p ON p.polrelid = c.oid
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
    GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
    HAVING count(p.polname) = 0
    ORDER BY c.relname;
  `);
  console.log(`Found ${rlsNoPolicy.rows.length} RLS tables without policies:`);
  rlsNoPolicy.rows.forEach(r => console.log(`  - ${r.table_name} (forced: ${r.rls_forced})`));

  // Also check public tables WITHOUT RLS enabled
  console.log('\n[1B. PUBLIC TABLES WITHOUT RLS]');
  const noRls = await client.query(`
    SELECT c.relname as table_name
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
    ORDER BY c.relname;
  `);
  console.log(`Found ${noRls.rows.length} public tables without RLS:`);
  noRls.rows.forEach(r => console.log(`  - ${r.table_name}`));

  // 2. Mutable search paths on remaining public routines
  console.log('\n[2. PUBLIC ROUTINES WITH MUTABLE SEARCH PATH]');
  const mutableSearchPaths = await client.query(`
    SELECT 
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args,
      p.prosecdef as is_secdef,
      p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND (p.proconfig IS NULL OR NOT (array_to_string(p.proconfig, ',') LIKE '%search_path=%'))
    ORDER BY p.proname;
  `);
  console.log(`Found ${mutableSearchPaths.rows.length} public routines without search_path set:`);
  mutableSearchPaths.rows.forEach(r => {
    console.log(`  - ${r.proname}(${r.args}) | secdef=${r.is_secdef} | proconfig=${JSON.stringify(r.proconfig)}`);
  });

  // 3. SECURITY DEFINER routines executable by anon or authenticated
  console.log('\n[3. SECURITY DEFINER ROUTINES EXECUTABLE BY ANON OR AUTHENTICATED]');
  const secdefRoutines = await client.query(`
    SELECT 
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args,
      p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.prosecdef = true
    ORDER BY p.proname;
  `);
  const secdefAccessible = [];
  for (const r of secdefRoutines.rows) {
    const anonCan = (await client.query("SELECT has_function_privilege('anon', $1, 'EXECUTE') as can", [r.oid])).rows[0].can;
    const authCan = (await client.query("SELECT has_function_privilege('authenticated', $1, 'EXECUTE') as can", [r.oid])).rows[0].can;
    if (anonCan || authCan) {
      secdefAccessible.push({
        name: r.proname,
        args: r.args,
        anon: anonCan,
        authenticated: authCan,
        proconfig: r.proconfig
      });
    }
  }
  console.log(`Found ${secdefAccessible.length} SECURITY DEFINER routines accessible to anon or authenticated:`);
  secdefAccessible.forEach(r => {
    console.log(`  - ${r.name}(${r.args}) -> anon: ${r.anon}, authenticated: ${r.authenticated} | proconfig: ${JSON.stringify(r.proconfig)}`);
  });

  // 4. Tables with Multiple Permissive Policies for the same command/role
  console.log('\n[4. MULTIPLE PERMISSIVE POLICIES ON THE SAME TABLE]');
  const multiPolicies = await client.query(`
    SELECT 
      c.relname as table_name,
      p.polcmd,
      count(*) as policy_count,
      array_agg(p.polname) as policy_names
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND p.polpermissive = true
    GROUP BY c.relname, p.polcmd
    HAVING count(*) > 1
    ORDER BY c.relname, p.polcmd;
  `);
  console.log(`Found ${multiPolicies.rows.length} combinations of multiple permissive policies:`);
  multiPolicies.rows.forEach(r => {
    const names = Array.isArray(r.policy_names) ? r.policy_names.join(', ') : r.policy_names;
    console.log(`  - Table "${r.table_name}" [CMD: ${r.polcmd}] (${r.policy_count} policies): ${names}`);
  });

  // 5. Unindexed foreign keys
  console.log('\n[5. UNINDEXED FOREIGN KEYS]');
  const unindexedFks = await client.query(`
    SELECT 
      c.conname as fk_name,
      t.relname as table_name,
      pg_get_constraintdef(c.oid) as constraint_def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.contype = 'f'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND (c.conkey::smallint[]) <@ (i.indkey::smallint[])
      )
    ORDER BY t.relname, c.conname;
  `);
  console.log(`Found ${unindexedFks.rows.length} unindexed foreign keys:`);
  unindexedFks.rows.slice(0, 20).forEach(r => {
    console.log(`  - ${r.table_name}: ${r.fk_name} -> ${r.constraint_def}`);
  });
  if (unindexedFks.rows.length > 20) {
    console.log(`  ... and ${unindexedFks.rows.length - 20} more.`);
  }

  // 6. Check auth settings / leaked password protection
  console.log('\n[6. AUTH / PASSWORD PROTECTION STATUS]');
  try {
    const authConfig = await client.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'auth' AND table_name = 'config';
    `);
    console.log('auth.config columns:', authConfig.rows.map(r => r.column_name));
  } catch (authErr) {
    console.log('auth.config inspection note:', authErr.message);
  }

  await client.end();
}

auditCatalog().catch(err => {
  console.error('Audit catalog failed:', err);
  process.exit(1);
});
