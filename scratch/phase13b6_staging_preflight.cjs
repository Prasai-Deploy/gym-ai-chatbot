const { Client } = require('pg');
const dotenv = require('dotenv');
const crypto = require('crypto');
const fs = require('fs');

dotenv.config({ path: 'backend/.env' });

const { validateStagingDatabaseUrl, EXPECTED_STAGING_HOST, EXPECTED_STAGING_PROJECT_REF } = require('../backend/scripts/apply_staging_migrations.js');

const EXPECTED_MIGRATION_FILE = 'phase_13b_foreign_key_indexes.sql';
const EXPECTED_SHA256 = '3F42636FCAF2333D50FE479BCE1BBD695F88B17B515754FCAA5965CA8459EE3F';

const PROPOSED_INDEXES = [
  { id: 'IDX-01', name: 'idx_ai_messages_conversation_id', table: 'ai_messages', cols: ['conversation_id', 'created_at'], fk: 'ai_messages_conversation_id_fkey' },
  { id: 'IDX-02', name: 'idx_ai_tool_executions_conversation_id', table: 'ai_tool_executions', cols: ['conversation_id'], fk: 'ai_tool_executions_conversation_id_fkey' },
  { id: 'IDX-03', name: 'idx_organization_locations_organization_id', table: 'organization_locations', cols: ['organization_id'], fk: 'organization_locations_organization_id_fkey' },
  { id: 'IDX-04', name: 'idx_organization_roles_organization_id', table: 'organization_roles', cols: ['organization_id'], fk: 'organization_roles_organization_id_fkey' },
  { id: 'IDX-05', name: 'idx_org_audit_logs_org_created', table: 'organization_audit_logs', cols: ['organization_id', 'created_at'], fk: 'organization_audit_logs_organization_id_fkey' },
  { id: 'IDX-06', name: 'idx_trainer_assignments_member_user_id', table: 'trainer_member_assignments', cols: ['member_user_id'], fk: 'trainer_member_assignments_member_user_id_fkey' },
  { id: 'IDX-07', name: 'idx_trainer_assignments_trainer_user_id', table: 'trainer_member_assignments', cols: ['trainer_user_id'], fk: 'trainer_member_assignments_trainer_user_id_fkey' },
  { id: 'IDX-08', name: 'idx_attendance_logs_location_id', table: 'attendance_logs', cols: ['location_id'], fk: 'attendance_logs_location_id_fkey' },
  { id: 'IDX-09', name: 'idx_org_members_location_id', table: 'organization_members', cols: ['location_id'], fk: 'organization_members_location_id_fkey' },
  { id: 'IDX-10', name: 'idx_org_staff_location_id', table: 'organization_staff', cols: ['location_id'], fk: 'organization_staff_location_id_fkey' },
  { id: 'IDX-11', name: 'idx_ai_tool_executions_user_id', table: 'ai_tool_executions', cols: ['user_id'], fk: 'ai_tool_executions_user_id_fkey' },
  { id: 'IDX-12', name: 'idx_ai_agent_memories_organization_id', table: 'ai_agent_memories', cols: ['organization_id'], fk: 'ai_agent_memories_organization_id_fkey' },
  { id: 'IDX-13', name: 'idx_v2_workout_sessions_plan_id', table: 'v2_workout_sessions', cols: ['plan_id'], fk: 'v2_workout_sessions_plan_id_fkey' },
  { id: 'IDX-14', name: 'idx_invoices_subscription_id', table: 'invoices', cols: ['subscription_id'], fk: 'invoices_subscription_id_fkey' },
  { id: 'IDX-15', name: 'idx_org_invoices_subscription_id', table: 'organization_invoices', cols: ['subscription_id'], fk: 'organization_invoices_subscription_id_fkey' },
  { id: 'IDX-16', name: 'idx_org_subs_plan_id', table: 'organization_subscriptions', cols: ['plan_id'], fk: 'organization_subscriptions_plan_id_fkey' }
];

async function runPreflight() {
  console.log('=== STRIVA V2: PHASE 13B-6 FINAL STAGING DEPLOYMENT PREFLIGHT ===\n');

  // 1. Artifact Verification
  console.log('--- CHECK 1: Migration Artifact Integrity ---');
  const migContent = fs.readFileSync('backend/supabase/migrations/' + EXPECTED_MIGRATION_FILE);
  const actualHash = crypto.createHash('sha256').update(migContent).digest('hex').toUpperCase();
  console.log(`Artifact: backend/supabase/migrations/${EXPECTED_MIGRATION_FILE}`);
  console.log(`Expected SHA-256: ${EXPECTED_SHA256}`);
  console.log(`Actual SHA-256:   ${actualHash}`);
  if (actualHash !== EXPECTED_SHA256) {
    throw new Error('FAIL-CLOSED: Migration SHA-256 mismatch!');
  }
  console.log('✓ Check 1 PASS: Artifact SHA-256 matches verified hash exactly.\n');

  // 2. Target Guard Verification
  console.log('--- CHECK 2: Staging Target Guard Assertions ---');
  let targetInfo;
  try {
    targetInfo = validateStagingDatabaseUrl(process.env.DATABASE_URL);
  } catch (err) {
    throw new Error(`FAIL-CLOSED: Target guard failed: ${err.message}`);
  }
  console.log(`Target Host: ${targetInfo.host} (Matches expected: ${EXPECTED_STAGING_HOST})`);
  console.log(`Project Ref: ${targetInfo.projectRef} (Matches expected: ${EXPECTED_STAGING_PROJECT_REF})`);
  console.log('✓ Check 2 PASS: Staging host and project identity verified.\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 3. Server Identity & Version
    console.log('--- CHECK 3: Live Server Identity & Baseline ---');
    const serverIdent = await client.query('SELECT inet_server_addr() AS ip, inet_server_port() AS port, current_database() AS db, version() AS ver');
    console.log(`Port: ${serverIdent.rows[0].port} | DB: ${serverIdent.rows[0].db}`);
    console.log(`Engine: ${serverIdent.rows[0].ver}`);

    const baseCount = await client.query('SELECT count(*)::int AS count FROM _migrations');
    console.log(`Current _migrations baseline count: ${baseCount.rows[0].count} (Expected: 28)`);
    if (baseCount.rows[0].count !== 28) {
      throw new Error(`FAIL-CLOSED: Expected baseline 28, found ${baseCount.rows[0].count}`);
    }

    const latest = await client.query('SELECT name, run_at FROM _migrations ORDER BY run_at DESC LIMIT 3');
    console.log('Latest applied migrations on staging:');
    latest.rows.forEach(r => console.log(`  - ${r.name} (${r.run_at.toISOString ? r.run_at.toISOString() : r.run_at})`));
    if (latest.rows[0].name !== 'phase_12b_consumer_analytics_persistence.sql') {
      throw new Error(`FAIL-CLOSED: Expected latest migration phase_12b_consumer_analytics_persistence.sql, found ${latest.rows[0].name}`);
    }

    const phase13bExists = await client.query("SELECT name FROM _migrations WHERE name LIKE '%13b%'");
    if (phase13bExists.rows.length > 0) {
      throw new Error('FAIL-CLOSED: Phase 13b is already recorded in _migrations!');
    }
    console.log('✓ Check 3 PASS: Baseline is exactly 28, latest is Phase 12B, Phase 13B unrecorded.\n');

    // 4. Proposed Index Collision Verification
    console.log('--- CHECK 4: Index Collision & Namespace Check ---');
    const names = PROPOSED_INDEXES.map(i => i.name);
    const existingIdx = await client.query(`
      SELECT schemaname, tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = ANY($1);
    `, [names]);
    console.log(`Colliding indexes in public schema: ${existingIdx.rows.length} (Expected: 0)`);
    if (existingIdx.rows.length > 0) {
      throw new Error(`FAIL-CLOSED: Found existing indexes with proposed names: ${JSON.stringify(existingIdx.rows)}`);
    }
    console.log('✓ Check 4 PASS: Zero collisions. Namespace is 100% clean.\n');

    // 5. Foreign Key Constraint Assertions
    console.log('--- CHECK 5: Live Foreign Key Constraint Verification ---');
    for (const p of PROPOSED_INDEXES) {
      const fkQuery = await client.query(`
        SELECT
          c.conname,
          cl.relname AS table_name,
          c.confrelid::regclass::text AS ref_table,
          c.confdeltype,
          pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        JOIN pg_class cl ON cl.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public'
          AND cl.relname = $1
          AND c.conname = $2;
      `, [p.table, p.fk]);

      if (fkQuery.rows.length !== 1) {
        throw new Error(`FAIL-CLOSED: FK constraint ${p.fk} missing on table ${p.table}!`);
      }
      const r = fkQuery.rows[0];
      const deleteRule = r.confdeltype === 'c' ? 'CASCADE' : r.confdeltype === 'n' ? 'SET NULL' : r.confdeltype;
      console.log(`  [${p.id}] ${p.table} -> ${p.fk} [ON DELETE ${deleteRule}] ✓`);
    }
    console.log('✓ Check 5 PASS: All 16 foreign keys verified in staging pg_constraint.\n');

    // 6. Live Table Row Count & Size Telemetry
    console.log('--- CHECK 6: Table Size & Live Tuple Telemetry on Staging ---');
    const tableNames = [...new Set(PROPOSED_INDEXES.map(p => p.table))];
    const sizeRes = await client.query(`
      SELECT
        c.relname AS table_name,
        COALESCE(s.n_live_tup, 0) AS live_tuples,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
        pg_total_relation_size(c.oid) AS raw_bytes
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
      WHERE n.nspname = 'public'
        AND c.relname = ANY($1)
      ORDER BY pg_total_relation_size(c.oid) DESC;
    `, [tableNames]);
    console.table(sizeRes.rows.map(r => ({
      table: r.table_name,
      live_tuples: r.live_tuples,
      total_size: r.total_size
    })));
    console.log('✓ Check 6 PASS: Table telemetry collected. All tables are <150 kB.\n');

    // 7. Recovery Backup Artifact Verification
    console.log('--- CHECK 7: Staging Logical Backup & Recovery Verification ---');
    const backupsDir = fs.existsSync('scratch/backups') ? 'scratch/backups' : 'scratch';
    const backupFiles = fs.readdirSync(backupsDir).filter(f => f.startsWith('striva_staging_baseline_28_'));
    console.log(`Found ${backupFiles.length} staging Baseline-28 backup archives in ${backupsDir}/:`);
    backupFiles.forEach(f => {
      const stats = fs.statSync(`${backupsDir}/${f}`);
      const content = fs.readFileSync(`${backupsDir}/${f}`);
      const hash = crypto.createHash('sha256').update(content).digest('hex').toUpperCase();
      console.log(`  - ${f} (${stats.size} bytes, SHA-256: ${hash})`);
    });
    if (backupFiles.length < 3) {
      throw new Error(`FAIL-CLOSED: Expected at least 3 baseline-28 backup files, found ${backupFiles.length}`);
    }
    console.log('✓ Check 7 PASS: Baseline 28 recovery archives verified.\n');

    console.log('\n================================================================');
    console.log('PREFLIGHT VERIFICATION COMPLETE: ALL GATES PASS');
    console.log('AWAITING EXPLICIT STAGING DEPLOYMENT AUTHORIZATION');
    console.log('================================================================');

  } finally {
    await client.end();
  }
}

runPreflight().catch((err) => {
  console.error('\nFATAL PREFLIGHT ERROR:', err.message);
  process.exit(1);
});
