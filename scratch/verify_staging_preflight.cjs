const path = require('path');
const dotenv = require(path.join(process.cwd(), 'node_modules', 'dotenv'));
const { Client } = require(path.join(process.cwd(), 'node_modules', 'pg'));

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('ERROR: DATABASE_URL not found in backend/.env');
  process.exit(1);
}

// Extract host and sanitize
const hostMatch = dbUrl.match(/@([^:]+):/);
const host = hostMatch ? hostMatch[1] : 'unknown';

console.log('=== STRIVA V2 — DB-5J LIVE STAGING READ-ONLY PREFLIGHT ===');
console.log('Target host identified:', host);

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('PostgreSQL connection established successfully.');

  // 1. Target project reference verification
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
  console.log('Host Domain:', host);
  const extractedRef = host.match(/db\.([^\.]+)\.supabase\.co/);
  console.log('Extracted Supabase Project Ref:', extractedRef ? extractedRef[1] : host);

  // 2. Custom migration table public._migrations
  const customMigRes = await client.query('SELECT count(*) FROM public._migrations;');
  const customCount = parseInt(customMigRes.rows[0].count, 10);
  console.log('\n[2. CUSTOM MIGRATION REGISTRY: public._migrations]');
  console.log('Total recorded migrations:', customCount);

  const allCustomMigs = await client.query('SELECT name, run_at FROM public._migrations ORDER BY run_at ASC;');
  console.log('All 25 custom migrations in public._migrations:');
  allCustomMigs.rows.forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${r.name} (${r.run_at})`);
  });

  // 3. Phase 11 presence check
  const phase11Check = await client.query("SELECT * FROM public._migrations WHERE name = 'phase_11_prelaunch_hardening.sql';");
  console.log('\n[3. PHASE 11 STATUS IN public._migrations]');
  console.log('phase_11_prelaunch_hardening.sql recorded:', phase11Check.rows.length > 0 ? 'YES' : 'NO (NOT RECORDED)');

  // 4. Supabase native migration table inspection (discrepancy documentation)
  console.log('\n[4. NATIVE SUPABASE MIGRATION REGISTRY]');
  try {
    const nativeCheck = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%schema_migrations%' OR table_name LIKE '%supabase_migrations%';
    `);
    console.log('Native migration tables found:', nativeCheck.rows);

    for (const tbl of nativeCheck.rows) {
      const cnt = await client.query(`SELECT count(*) FROM "${tbl.table_schema}"."${tbl.table_name}";`);
      console.log(`  Table "${tbl.table_schema}"."${tbl.table_name}" rows:`, cnt.rows[0].count);
      const rows = await client.query(`SELECT * FROM "${tbl.table_schema}"."${tbl.table_name}" LIMIT 5;`);
      console.log(`  Sample rows from "${tbl.table_schema}"."${tbl.table_name}":`, rows.rows);
    }
  } catch (nativeErr) {
    console.log('Native migrations query notice:', nativeErr.message);
  }

  // 5. profiles.organization_id column default check
  console.log('\n[5. PROFILES COLUMN DEFAULT STATUS]');
  const colRes = await client.query(`
    SELECT column_name, column_default, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_id';
  `);
  console.log('profiles.organization_id metadata:', colRes.rows[0]);

  // 6. Check unassigned profiles holding fallback UUID
  const unassignedRes = await client.query(`
    SELECT count(*) FROM public.profiles 
    WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid;
  `);
  console.log('Profiles currently holding fallback UUID 00000000-0000-0000-0000-000000000001:', unassignedRes.rows[0].count);

  await client.end();
  console.log('\n✓ READ-ONLY PREFLIGHT QUERIES COMPLETE.');
}

run().catch(err => {
  console.error('Preflight inspection failed:', err.message);
  process.exit(1);
});
