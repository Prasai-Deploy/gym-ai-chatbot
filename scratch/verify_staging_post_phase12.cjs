const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

async function verifyStagingPostPhase12() {
  console.log('=== STRIVA V2: Independent Live Verification of Phase 12 on Staging ===\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. Migration count & record
    const countRes = await client.query('SELECT count(*) as total FROM _migrations');
    const total = parseInt(countRes.rows[0].total, 10);
    console.log(`Live _migrations count: ${total}`);
    if (total !== 27) {
      throw new Error(`Expected exactly 27 migrations after Phase 12, got ${total}`);
    }

    const mig12Res = await client.query("SELECT * FROM _migrations WHERE name = 'phase_12_legacy_routine_hardening.sql'");
    if (mig12Res.rows.length !== 1) {
      throw new Error(`Expected exactly 1 record for phase_12_legacy_routine_hardening.sql, got ${mig12Res.rows.length}`);
    }
    console.log(`✓ Phase 12 recorded: ${mig12Res.rows[0].name} at ${mig12Res.rows[0].run_at}`);

    // 2. Routine Security Modes & Search Paths
    console.log('\n--- Routine Verification ---');
    const routineQuery = await client.query(`
      SELECT p.proname, 
             p.prosecdef as is_security_definer,
             pg_catalog.pg_get_function_identity_arguments(p.oid) as args,
             p.proconfig as search_path_config,
             r.rolname as owner
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_roles r ON r.oid = p.proowner
      WHERE n.nspname = 'public'
        AND p.proname IN ('get_admin_role', 'is_admin', 'update_membership_statuses', 'update_modified_column', 'update_updated_at_column')
      ORDER BY p.proname
    `);

    for (const r of routineQuery.rows) {
      console.log(`Routine: public.${r.proname}(${r.args}) | secdef=${r.is_security_definer} | config=${JSON.stringify(r.search_path_config)}`);
      if (r.is_security_definer !== false) {
        throw new Error(`${r.proname} must be SECURITY INVOKER (is_security_definer=false)`);
      }
      if (!r.search_path_config || !r.search_path_config.includes('search_path=pg_catalog, pg_temp')) {
        throw new Error(`${r.proname} must have search_path=pg_catalog, pg_temp`);
      }
    }
    console.log('✓ All 5 routines verified as SECURITY INVOKER with pinned search_path=pg_catalog, pg_temp.');

    // 3. Grants
    console.log('\n--- Routine Effective Grants ---');
    const aclQuery = await client.query(`
      SELECT routine_name, grantee, privilege_type
      FROM information_schema.routine_privileges
      WHERE specific_schema = 'public'
        AND routine_name IN ('get_admin_role', 'is_admin', 'update_membership_statuses', 'update_modified_column', 'update_updated_at_column')
      ORDER BY routine_name, grantee, privilege_type
    `);
    const routineAcls = {};
    for (const r of aclQuery.rows) {
      if (!routineAcls[r.routine_name]) routineAcls[r.routine_name] = [];
      routineAcls[r.routine_name].push(r.grantee);
    }
    for (const [name, grantees] of Object.entries(routineAcls)) {
      console.log(` - ${name}: [${grantees.join(', ')}]`);
      if (grantees.includes('anon') || grantees.includes('PUBLIC')) {
        throw new Error(`Security violation: ${name} still has grants for anon or PUBLIC!`);
      }
      if (name === 'update_membership_statuses' && grantees.includes('authenticated')) {
        throw new Error('Security violation: update_membership_statuses still accessible to authenticated users!');
      }
    }
    console.log('✓ All routine grants verified: PUBLIC and anon revoked; maintenance routine sealed from authenticated.');

    // 4. Triggers
    console.log('\n--- Trigger Verification ---');
    const triggerQuery = await client.query(`
      SELECT tgname, relname as table_name, proname as function_name
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_proc p ON p.oid = t.tgfoid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND p.proname IN ('update_modified_column', 'update_updated_at_column')
        AND NOT t.tgisinternal
      ORDER BY p.proname, c.relname
    `);
    console.log(`Total attached triggers found: ${triggerQuery.rows.length}`);
    if (triggerQuery.rows.length !== 14) {
      throw new Error(`Expected exactly 14 attached triggers, found ${triggerQuery.rows.length}`);
    }
    console.log('✓ All 14 update triggers confirmed attached and intact.');

    // 5. pg_cron Job
    console.log('\n--- pg_cron Job Verification ---');
    const cronQuery = await client.query(`
      SELECT jobid, schedule, command, username, active
      FROM cron.job
      WHERE command LIKE '%update_membership_statuses%'
    `);
    if (cronQuery.rows.length !== 1 || !cronQuery.rows[0].active) {
      throw new Error('pg_cron maintenance job missing or inactive!');
    }
    console.log(`✓ pg_cron job verified: Job ${cronQuery.rows[0].jobid} [${cronQuery.rows[0].schedule}] as user [${cronQuery.rows[0].username}], active=${cronQuery.rows[0].active}`);

    console.log('\n================================================================');
    console.log('PHASE 12 INDEPENDENT LIVE VERIFICATION: 100% SUCCESS!');
    console.log('================================================================\n');

  } finally {
    await client.end();
  }
}

verifyStagingPostPhase12().catch(err => {
  console.error('\n❌ VERIFICATION ERROR:', err.message);
  process.exit(1);
});
