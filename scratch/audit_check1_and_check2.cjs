const { Client } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

async function verify() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('=== CHECK 1: MIGRATION BASELINE ===');
  const migs = await client.query('SELECT name FROM _migrations');
  console.log('Total count:', migs.rows.length);
  migs.rows.forEach((r, idx) => console.log(`${idx + 1}: ${r.name}`));

  console.log('\n=== CHECK 2: FIVE ROUTINES ===');
  const funcs = await client.query(`
    SELECT p.proname,
           pg_get_function_identity_arguments(p.oid) as args,
           p.prosecdef,
           p.proconfig,
           p.proacl
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_admin_role', 'is_admin', 'update_membership_statuses', 'update_modified_column', 'update_updated_at_column')
    ORDER BY p.proname
  `);
  console.table(funcs.rows);

  console.log('\n=== CHECK 2: CRON JOBS ===');
  const cron = await client.query('SELECT jobid, jobname, schedule, command, active FROM cron.job');
  console.table(cron.rows);

  console.log('\n=== CHECK 2: 14 TRIGGERS ===');
  const trigs = await client.query(`
    SELECT t.tgname, c.relname, p.proname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('update_modified_column', 'update_updated_at_column')
      AND NOT t.tgisinternal
    ORDER BY c.relname, t.tgname
  `);
  console.log(`Trigger count: ${trigs.rows.length}`);
  console.table(trigs.rows);

  await client.end();
}
verify().catch(console.error);
