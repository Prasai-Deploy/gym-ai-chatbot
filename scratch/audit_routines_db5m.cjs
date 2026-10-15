const path = require('path');
const dotenv = require(path.join(process.cwd(), 'node_modules', 'dotenv'));
const { Client } = require(path.join(process.cwd(), 'node_modules', 'pg'));

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function auditRoutines() {
  await client.connect();
  console.log('=== STRIVA V2 — DB-5M ROUTINE SECURITY AUDIT ===\n');

  const routines = [
    'reset_demo_account',
    'handle_new_user',
    'is_org_member',
    'enforce_workout_session_state_transition'
  ];

  for (const name of routines) {
    console.log(`=======================================================`);
    console.log(`ROUTINE: public.${name}`);
    console.log(`=======================================================`);

    // 1. pg_proc metadata
    const procRes = await client.query(`
      SELECT 
        p.oid,
        p.proname,
        pg_get_function_identity_arguments(p.oid) as identity_args,
        pg_get_function_result(p.oid) as result_type,
        p.prosecdef as is_security_definer,
        p.proleakproof,
        p.provolatile,
        p.proconfig as search_path_config,
        pg_get_userbyid(p.proowner) as owner,
        p.proacl as raw_acl
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = $1;
    `, [name]);

    if (procRes.rows.length === 0) {
      console.log('STATUS: NOT FOUND IN public NAMESPACE');
      continue;
    }

    const p = procRes.rows[0];
    console.log(`Identity: ${p.proname}(${p.identity_args}) -> ${p.result_type}`);
    console.log(`Owner: ${p.owner}`);
    console.log(`Execution Mode: ${p.is_security_definer ? 'SECURITY DEFINER' : 'SECURITY INVOKER'}`);
    console.log(`Volatility: ${p.provolatile === 'v' ? 'VOLATILE' : p.provolatile === 's' ? 'STABLE' : 'IMMUTABLE'}`);
    console.log(`Search Path Config: ${JSON.stringify(p.search_path_config)}`);
    console.log(`Raw ACL: ${p.raw_acl ? JSON.stringify(p.raw_acl) : 'NULL (default privileges: public can execute unless revoked)'}`);

    // 2. Effective Routine Privileges
    const privRes = await client.query(`
      SELECT 
        grantee, 
        privilege_type,
        is_grantable
      FROM information_schema.routine_privileges 
      WHERE routine_schema = 'public' AND routine_name = $1
      ORDER BY grantee;
    `, [name]);
    console.log('\nEffective Granted Privileges:');
    if (privRes.rows.length === 0) {
      console.log('  (None explicit in information_schema)');
    } else {
      privRes.rows.forEach(r => console.log(`  - Grantee: ${r.grantee} | Privilege: ${r.privilege_type} | Grantable: ${r.is_grantable}`));
    }

    // Check specific role execution permissions via has_function_privilege
    console.log('\nhas_function_privilege checks for key roles:');
    const roles = ['anon', 'authenticated', 'service_role', 'postgres', 'supabase_auth_admin'];
    for (const role of roles) {
      try {
        const canExec = await client.query(`
          SELECT has_function_privilege($1, $2, 'EXECUTE') as can_exec;
        `, [role, p.oid]);
        console.log(`  - Role "${role}": EXECUTE = ${canExec.rows[0].can_exec}`);
      } catch (roleErr) {
        console.log(`  - Role "${role}": Error checking -> ${roleErr.message}`);
      }
    }

    // 3. Triggers associated with this function
    const trigRes = await client.query(`
      SELECT 
        c.relname as table_name,
        t.tgname as trigger_name,
        t.tgenabled as is_enabled,
        pg_get_triggerdef(t.oid) as trigger_def
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE t.tgfoid = $1 AND NOT t.tgisinternal;
    `, [p.oid]);
    if (trigRes.rows.length > 0) {
      console.log('\nAssociated Triggers:');
      trigRes.rows.forEach(t => {
        console.log(`  - Trigger "${t.trigger_name}" on table "${t.table_name}" (Enabled: ${t.is_enabled}):`);
        console.log(`    ${t.trigger_def}`);
      });
    }

    // 4. Source definition
    const defRes = await client.query(`SELECT pg_get_functiondef($1) as def;`, [p.oid]);
    console.log('\nSource Code Definition:');
    console.log(defRes.rows[0].def);
    console.log('\n');
  }

  await client.end();
}

auditRoutines().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
