const path = require('path');
const dotenv = require(path.join(process.cwd(), 'node_modules', 'dotenv'));
const { Client } = require(path.join(process.cwd(), 'node_modules', 'pg'));

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('=== STRIVA V2 — DB-5O LEGACY ROUTINE DEEP INSPECTION ===\n');

  const routines = [
    'get_admin_role',
    'is_admin',
    'update_membership_statuses',
    'update_modified_column',
    'update_updated_at_column'
  ];

  for (const name of routines) {
    console.log(`=======================================================`);
    console.log(`INSPECTING: public.${name}`);
    console.log(`=======================================================`);

    // 1. Proc metadata
    const procRes = await client.query(`
      SELECT 
        p.oid,
        p.proname,
        pg_get_function_identity_arguments(p.oid) as identity_args,
        pg_get_function_result(p.oid) as result_type,
        p.prosecdef as is_secdef,
        p.provolatile,
        p.proconfig as search_path_config,
        pg_get_userbyid(p.proowner) as owner,
        p.proacl
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = $1;
    `, [name]);

    if (procRes.rows.length === 0) {
      console.log('NOT FOUND in public namespace');
      continue;
    }

    const p = procRes.rows[0];
    console.log(`OID: ${p.oid}`);
    console.log(`Identity: ${p.proname}(${p.identity_args}) -> ${p.result_type}`);
    console.log(`Owner: ${p.owner}`);
    console.log(`Mode: ${p.is_secdef ? 'SECURITY DEFINER' : 'SECURITY INVOKER'}`);
    console.log(`Volatility: ${p.provolatile}`);
    console.log(`Search Path Config: ${JSON.stringify(p.search_path_config)}`);
    console.log(`proacl: ${p.proacl ? JSON.stringify(p.proacl) : 'NULL (default privileges: public executable unless revoked)'}`);

    // 2. has_function_privilege
    console.log('\nhas_function_privilege checks:');
    for (const role of ['anon', 'authenticated', 'service_role', 'postgres']) {
      const can = await client.query(`SELECT has_function_privilege($1, $2, 'EXECUTE') as can`, [role, p.oid]);
      console.log(`  - ${role}: ${can.rows[0].can}`);
    }

    // 3. information_schema.routine_privileges
    const aclRes = await client.query(`
      SELECT grantee, privilege_type, is_grantable
      FROM information_schema.routine_privileges
      WHERE routine_schema = 'public' AND routine_name = $1
      ORDER BY grantee;
    `, [name]);
    console.log('\nRoutine Privileges in information_schema:');
    aclRes.rows.forEach(r => console.log(`  - Grantee: ${r.grantee} (${r.privilege_type}, grantable: ${r.is_grantable})`));

    // 4. Function Definition
    const defRes = await client.query(`SELECT pg_get_functiondef($1) as def;`, [p.oid]);
    console.log('\nFunction Definition:');
    console.log(defRes.rows[0].def);

    // 5. Attached Triggers
    const trigRes = await client.query(`
      SELECT 
        c.relname as table_name,
        t.tgname as trigger_name,
        t.tgenabled as is_enabled,
        t.tgtype,
        pg_get_triggerdef(t.oid) as trigger_def
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE t.tgfoid = $1 AND NOT t.tgisinternal;
    `, [p.oid]);
    console.log('\nAttached Triggers:');
    if (trigRes.rows.length === 0) {
      console.log('  None attached.');
    } else {
      trigRes.rows.forEach(t => {
        console.log(`  - Table: "${t.table_name}", Trigger: "${t.trigger_name}", Enabled: ${t.is_enabled}`);
        console.log(`    Definition: ${t.trigger_def}`);
      });
    }

    // 6. Dependent Policies (where policy definition mentions this routine)
    const polRes = await client.query(`
      SELECT 
        c.relname as table_name,
        p.polname as policy_name,
        p.polcmd as command,
        p.polroles,
        pg_get_expr(p.polqual, p.polrelid) as qual,
        pg_get_expr(p.polwithcheck, p.polrelid) as with_check
      FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      WHERE (p.polqual IS NOT NULL AND pg_get_expr(p.polqual, p.polrelid) LIKE '%' || $1 || '%')
         OR (p.polwithcheck IS NOT NULL AND pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%' || $1 || '%');
    `, [name]);
    console.log('\nDependent RLS Policies:');
    if (polRes.rows.length === 0) {
      console.log('  None mentioning this routine.');
    } else {
      polRes.rows.forEach(pol => {
        console.log(`  - Table: "${pol.table_name}", Policy: "${pol.policy_name}" [${pol.command}]`);
        console.log(`    Qual: ${pol.qual}`);
        console.log(`    With Check: ${pol.with_check}`);
      });
    }

    // 7. General pg_depend checks (objects depending on this function)
    const depRes = await client.query(`
      SELECT 
        deptype,
        classid::regclass as dependent_class,
        objid,
        CASE 
          WHEN classid = 'pg_proc'::regclass THEN (SELECT proname FROM pg_proc WHERE oid = objid)
          WHEN classid = 'pg_class'::regclass THEN (SELECT relname FROM pg_class WHERE oid = objid)
          WHEN classid = 'pg_trigger'::regclass THEN (SELECT tgname FROM pg_trigger WHERE oid = objid)
          WHEN classid = 'pg_policy'::regclass THEN (SELECT polname FROM pg_policy WHERE oid = objid)
          ELSE 'other'
        END as dependent_name
      FROM pg_depend
      WHERE refobjid = $1 AND refclassid = 'pg_proc'::regclass;
    `, [p.oid]);
    console.log('\npg_depend Objects Depending on Routine:');
    if (depRes.rows.length === 0) {
      console.log('  None recorded.');
    } else {
      depRes.rows.forEach(d => {
        console.log(`  - Type: ${d.deptype}, Class: ${d.dependent_class}, Name: ${d.dependent_name} (OID: ${d.objid})`);
      });
    }

    console.log('\n');
  }

  // Check admins table status and structure
  console.log('=======================================================');
  console.log('CHECKING RELATED LEGACY TABLES');
  console.log('=======================================================');
  const tableCheck = await client.query(`
    SELECT 
      table_name,
      table_schema
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('admins', 'memberships', 'membership_plans');
  `);
  console.log('Related legacy tables found:', tableCheck.rows);

  for (const tbl of tableCheck.rows) {
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [tbl.table_name]);
    console.log(`\nColumns for public.${tbl.table_name}:`);
    cols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`));

    const cnt = await client.query(`SELECT count(*) FROM public."${tbl.table_name}";`);
    console.log(`Row count for public.${tbl.table_name}: ${cnt.rows[0].count}`);
  }

  await client.end();
}

run().catch(err => {
  console.error('Audit script failed:', err);
  process.exit(1);
});
