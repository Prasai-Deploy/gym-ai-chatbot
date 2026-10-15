const path = require('path');
const dotenv = require(path.join(process.cwd(), 'node_modules', 'dotenv'));
const { Client } = require(path.join(process.cwd(), 'node_modules', 'pg'));

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('ERROR: DATABASE_URL not found in backend/.env');
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('=== STRIVA V2 — DB-5L POST-DEPLOYMENT INDEPENDENT VERIFICATION ===');

  // 1. Target identity & host
  const idRes = await client.query(`
    SELECT 
      current_database() as database_name,
      current_user as database_user,
      version() as pg_version;
  `);
  console.log('\n[1. TARGET IDENTITY]');
  console.log('Database Name:', idRes.rows[0].database_name);
  console.log('Database User:', idRes.rows[0].database_user);
  console.log('PostgreSQL Version:', idRes.rows[0].pg_version.split(',')[0]);

  // 2. Migration count & phase_11 record
  console.log('\n[2. MIGRATION HISTORY]');
  const countRes = await client.query('SELECT count(*) FROM public._migrations;');
  const totalCount = parseInt(countRes.rows[0].count, 10);
  console.log('Total migrations in public._migrations:', totalCount);

  const mig11Res = await client.query("SELECT * FROM public._migrations WHERE name = 'phase_11_prelaunch_hardening.sql';");
  console.log('phase_11_prelaunch_hardening.sql occurrences:', mig11Res.rows.length);
  if (mig11Res.rows.length > 0) {
    console.log('phase_11 applied at:', mig11Res.rows[0].run_at);
  }

  const latestMigs = await client.query('SELECT name, run_at FROM public._migrations ORDER BY run_at DESC LIMIT 5;');
  console.log('Latest 5 migrations:');
  latestMigs.rows.forEach(r => console.log(' ', r.name, '->', r.run_at));

  // 3. profiles.organization_id column default
  console.log('\n[3. PROFILES.ORGANIZATION_ID DEFAULT]');
  const colRes = await client.query(`
    SELECT column_name, column_default, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_id';
  `);
  console.log('Column metadata:', colRes.rows[0]);
  console.log('Default is NULL / dropped:', colRes.rows[0].column_default === null ? 'YES' : 'NO: ' + colRes.rows[0].column_default);

  // 4. Five profiles organization assignments
  console.log('\n[4. PROFILES ORGANIZATION ASSIGNMENTS]');
  const profRes = await client.query('SELECT id, email, organization_id FROM public.profiles ORDER BY id;');
  profRes.rows.forEach(r => {
    console.log(`  Profile ${r.id} (${r.email}): organization_id = ${r.organization_id === null ? 'NULL' : r.organization_id}`);
  });
  const fallbackCount = await client.query("SELECT count(*) FROM public.profiles WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid;");
  console.log('Profiles still holding fallback UUID:', fallbackCount.rows[0].count);

  // 5. reset_demo_account routine inspection
  console.log('\n[5. RESET_DEMO_ACCOUNT FUNCTION & GRANTS]');
  const funcRes = await client.query(`
    SELECT 
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args,
      pg_get_function_result(p.oid) as result_type,
      p.prosecdef,
      p.proconfig,
      d.description
    FROM pg_proc p
    LEFT JOIN pg_description d ON d.objoid = p.oid
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'reset_demo_account';
  `);
  if (funcRes.rows.length === 0) {
    console.error('ERROR: reset_demo_account NOT FOUND in public namespace!');
  } else {
    console.log('Function found:', funcRes.rows[0]);
  }

  // Check routine grants
  const grantRes = await client.query(`
    SELECT 
      grantee, 
      privilege_type 
    FROM information_schema.routine_privileges 
    WHERE routine_schema = 'public' AND routine_name = 'reset_demo_account';
  `);
  console.log('reset_demo_account grants:', grantRes.rows);

  // Check function source code keywords (identity check, legacy resolution, transaction safety)
  const srcRes = await client.query(`
    SELECT pg_get_functiondef(p.oid) as definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'reset_demo_account';
  `);
  if (srcRes.rows.length > 0) {
    const src = srcRes.rows[0].definition;
    console.log('reset_demo_account source verification:');
    console.log('  Contains demo@sweatfix.com check:', src.includes('demo@sweatfix.com'));
    console.log('  Contains legacy_user_id_map resolution:', src.includes('legacy_user_id_map'));
    console.log('  Contains v2_workout_sessions deletion:', src.includes('v2_workout_sessions'));
    console.log('  Contains search_path setting:', src.includes('SET search_path TO \'pg_catalog\', \'pg_temp\'') || src.includes('search_path = pg_catalog, pg_temp') || src.includes('search_path'));
  }

  // 6. Hardened routines inspection: handle_new_user, is_org_member, enforce_workout_session_state_transition
  console.log('\n[6. HARDENED ROUTINES SEARCH_PATH & GRANTS]');
  const hardenedRoutines = await client.query(`
    SELECT 
      p.proname,
      p.prosecdef,
      p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname IN ('handle_new_user', 'is_org_member', 'enforce_workout_session_state_transition');
  `);
  hardenedRoutines.rows.forEach(r => {
    console.log(`  Routine "${r.proname}": secdef=${r.prosecdef}, proconfig=${JSON.stringify(r.proconfig)}`);
  });

  // Check grants on handle_new_user and is_org_member
  const routineGrants = await client.query(`
    SELECT routine_name, grantee, privilege_type 
    FROM information_schema.routine_privileges 
    WHERE routine_schema = 'public' 
      AND routine_name IN ('handle_new_user', 'is_org_member');
  `);
  console.log('Routine privileges for handle_new_user & is_org_member:');
  routineGrants.rows.forEach(r => {
    console.log(`  ${r.routine_name} -> ${r.grantee} (${r.privilege_type})`);
  });

  // 7. Identity mappings and hydration data intact
  console.log('\n[7. DATA INTEGRITY & BASELINE CHECKS]');
  const legacyMapRes = await client.query('SELECT count(*) FROM public.legacy_user_id_map;');
  console.log('legacy_user_id_map rows:', legacyMapRes.rows[0].count);

  const waterRes = await client.query('SELECT count(*) FROM public.water_logs;');
  console.log('water_logs rows:', waterRes.rows[0].count);

  const subRes = await client.query('SELECT count(*) FROM public.subscriptions;');
  console.log('subscriptions rows:', subRes.rows[0].count);

  const orgRes = await client.query('SELECT count(*) FROM public.organizations;');
  console.log('organizations rows:', orgRes.rows[0].count);

  const exerciseRes = await client.query('SELECT count(*) FROM public.exercises;');
  console.log('exercises rows:', exerciseRes.rows[0].count);

  await client.end();
  console.log('\n✓ POST-DEPLOYMENT VERIFICATION COMPLETE.');
}

run().catch(err => {
  console.error('Post-deployment verification error:', err);
  process.exit(1);
});
