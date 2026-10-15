const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

async function inspectStagingPreflight() {
  console.log('================================================================');
  console.log('STRIVA V2 - Phase 12C: Read-Only Staging Preflight Inspection');
  console.log('Target Host: db.ymrblyiwohvxptiqjfsi.supabase.co:5432');
  console.log('================================================================\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('[CONNECTED] Successfully established read-only connection to staging database.');

    // 1. Connection & Project Identity
    const hostInfo = await client.query(`
      SELECT inet_server_addr() as server_ip, 
             inet_server_port() as server_port, 
             current_database() as database_name, 
             current_user as current_user, 
             version() as pg_version
    `);
    console.log('\n--- 1. Connection & Server Identity ---');
    console.log(hostInfo.rows[0]);

    // 2. Migration History & Baseline Count
    console.log('\n--- 2. Migration Baseline in public._migrations ---');
    const migCount = await client.query('SELECT count(*) as total FROM _migrations');
    console.log(`Total records in _migrations: ${migCount.rows[0].total}`);

    const allMigs = await client.query('SELECT name, run_at FROM _migrations ORDER BY run_at ASC');
    console.log('All migrations applied on staging:');
    allMigs.rows.forEach((r, idx) => {
      console.log(` [${idx + 1}] ${r.name} (${r.run_at.toISOString ? r.run_at.toISOString() : r.run_at})`);
    });

    const hasPhase12 = allMigs.rows.some(r => r.name.includes('phase_12'));
    console.log(`\nContains any Phase 12 migration: ${hasPhase12}`);

    // 3. Current Routine Definitions & Properties on Staging
    console.log('\n--- 3. Catalog Inspection: 5 Legacy Routines ---');
    const routineQuery = await client.query(`
      SELECT p.proname, 
             p.prosecdef as is_security_definer,
             pg_catalog.pg_get_function_identity_arguments(p.oid) as args,
             p.proconfig as search_path_config,
             pg_catalog.pg_get_functiondef(p.oid) as definition,
             r.rolname as owner
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_roles r ON r.oid = p.proowner
      WHERE n.nspname = 'public'
        AND p.proname IN ('get_admin_role', 'is_admin', 'update_membership_statuses', 'update_modified_column', 'update_updated_at_column')
      ORDER BY p.proname
    `);

    for (const r of routineQuery.rows) {
      console.log(`\nRoutine: public.${r.proname}(${r.args})`);
      console.log(` - Owner: ${r.owner}`);
      console.log(` - Security Definer: ${r.is_security_definer}`);
      console.log(` - Config (search_path): ${JSON.stringify(r.search_path_config)}`);
    }

    // Effective routine ACLs
    console.log('\n--- 3.1. Routine Grants / Permissions ---');
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
      routineAcls[r.routine_name].push(`${r.grantee}:${r.privilege_type}`);
    }
    for (const [name, acls] of Object.entries(routineAcls)) {
      console.log(` - ${name}: ${acls.join(', ')}`);
    }

    // 4. Trigger Attachments
    console.log('\n--- 4. Attached Triggers for update_modified_column & update_updated_at_column ---');
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
    triggerQuery.rows.forEach(t => console.log(` - Trigger [${t.tgname}] on table [${t.table_name}] -> ${t.function_name}()`));

    // 5. pg_cron Job Inspection
    console.log('\n--- 5. pg_cron Jobs ---');
    const cronQuery = await client.query(`
      SELECT jobid, schedule, command, nodename, nodeport, database, username, active
      FROM cron.job
      ORDER BY jobid
    `);
    console.log(`Total cron jobs: ${cronQuery.rows.length}`);
    cronQuery.rows.forEach(j => {
      console.log(` - Job ${j.jobid}: [${j.schedule}] "${j.command}" as user [${j.username}], active=${j.active}`);
    });

    // 6. public.ai_usage_analytics Schema, Constraints & Policies
    console.log('\n--- 6. public.ai_usage_analytics Column Nullability & Constraints ---');
    const colQuery = await client.query(`
      SELECT column_name, is_nullable, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'ai_usage_analytics'
      ORDER BY ordinal_position
    `);
    colQuery.rows.forEach(c => console.log(` - ${c.column_name}: type=${c.data_type}, nullable=${c.is_nullable}, default=${c.column_default}`));

    // Check foreign keys
    console.log('\nForeign Keys on ai_usage_analytics:');
    const fkQuery = await client.query(`
      SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='ai_usage_analytics'
    `);
    fkQuery.rows.forEach(f => console.log(` - ${f.constraint_name} (${f.column_name} -> ${f.foreign_table_name}.${f.foreign_column_name})`));

    // Check indexes
    console.log('\nIndexes on ai_usage_analytics:');
    const idxQuery = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'ai_usage_analytics'
      ORDER BY indexname
    `);
    idxQuery.rows.forEach(i => console.log(` - ${i.indexname}: ${i.indexdef}`));

    // Check RLS policies
    console.log('\nRLS Policies on ai_usage_analytics:');
    const policyQuery = await client.query(`
      SELECT policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename = 'ai_usage_analytics'
      ORDER BY policyname
    `);
    console.log(`Total policies on ai_usage_analytics: ${policyQuery.rows.length}`);
    policyQuery.rows.forEach(p => console.log(` - "${p.policyname}" (${p.cmd}) roles=${p.roles} qual=${p.qual}`));

  } catch (err) {
    console.error('ERROR during read-only staging preflight inspection:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

inspectStagingPreflight();
