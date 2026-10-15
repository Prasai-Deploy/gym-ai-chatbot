const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

const { validateStagingDatabaseUrl, EXPECTED_STAGING_HOST, EXPECTED_STAGING_PROJECT_REF } = require('../backend/scripts/apply_staging_migrations.js');

const PROPOSED_INDEX_NAMES = [
  'idx_ai_messages_conversation_id',
  'idx_ai_tool_executions_conversation_id',
  'idx_organization_locations_organization_id',
  'idx_organization_roles_organization_id',
  'idx_org_audit_logs_org_created',
  'idx_trainer_assignments_member_user_id',
  'idx_trainer_assignments_trainer_user_id',
  'idx_attendance_logs_location_id',
  'idx_org_members_location_id',
  'idx_org_staff_location_id',
  'idx_ai_tool_executions_user_id',
  'idx_ai_agent_memories_organization_id',
  'idx_v2_workout_sessions_plan_id',
  'idx_invoices_subscription_id',
  'idx_org_invoices_subscription_id',
  'idx_org_subs_plan_id'
];

const CANDIDATE_TABLES = [
  'ai_messages',
  'ai_tool_executions',
  'organization_locations',
  'organization_roles',
  'organization_audit_logs',
  'trainer_member_assignments',
  'attendance_logs',
  'organization_members',
  'organization_staff',
  'ai_agent_memories',
  'v2_workout_sessions',
  'invoices',
  'organization_invoices',
  'organization_subscriptions'
];

async function runReadOnlyAudit() {
  console.log('=== STRIVA V2: PHASE 13B-5 READ-ONLY STAGING TARGET INSPECTION ===\n');

  // Guard: strictly assert staging database URL
  let targetInfo;
  try {
    targetInfo = validateStagingDatabaseUrl(process.env.DATABASE_URL);
  } catch (err) {
    console.error('STAGING GUARD FAILED:', err.message);
    process.exit(1);
  }

  console.log(`[GUARD PASS] Verified staging target: Project "${targetInfo.projectRef}" on host "${targetInfo.host}"`);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('[CONNECTED] Connected to remote staging database.');

    // 1. Host and version info
    const identity = await client.query(`
      SELECT inet_server_addr() AS ip,
             inet_server_port() AS port,
             current_database() AS db_name,
             current_user AS user_name,
             version() AS pg_version;
    `);
    console.log('\n--- 1. Staging Database Identity ---');
    console.log({
      port: identity.rows[0].port,
      db_name: identity.rows[0].db_name,
      user_name: identity.rows[0].user_name,
      pg_version: identity.rows[0].pg_version
    });

    // 2. Baseline and migrations
    const baseline = await client.query('SELECT count(*)::int AS count FROM _migrations');
    console.log(`\n--- 2. Migration Baseline: ${baseline.rows[0].count} ---`);

    const latestMigs = await client.query('SELECT name, run_at FROM _migrations ORDER BY run_at DESC LIMIT 5');
    console.log('Latest applied migrations on staging:');
    latestMigs.rows.forEach(r => console.log(`  - ${r.name} (${r.run_at.toISOString ? r.run_at.toISOString() : r.run_at})`));

    // Check if phase_13b is recorded
    const phase13bRecord = await client.query("SELECT name FROM _migrations WHERE name LIKE '%13b%'");
    console.log(`Phase 13b migration recorded on staging: ${phase13bRecord.rows.length > 0}`);

    // 3. Check for existing proposed index names on staging
    const collisionCheck = await client.query(`
      SELECT schemaname, tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = ANY($1);
    `, [PROPOSED_INDEX_NAMES]);
    console.log(`\n--- 3. Proposed Index Name Collision on Staging: ${collisionCheck.rows.length} collisions ---`);
    if (collisionCheck.rows.length > 0) {
      console.table(collisionCheck.rows);
    }

    // 4. Staging table sizes and live tuple counts
    const tableStats = await client.query(`
      SELECT
        c.relname AS table_name,
        s.n_live_tup AS live_tuples,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
        pg_size_pretty(pg_relation_size(c.oid)) AS table_size,
        pg_size_pretty(pg_indexes_size(c.oid)) AS indexes_size,
        pg_total_relation_size(c.oid) AS raw_bytes
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
      WHERE n.nspname = 'public'
        AND c.relname = ANY($1)
      ORDER BY pg_total_relation_size(c.oid) DESC;
    `, [CANDIDATE_TABLES]);
    console.log('\n--- 4. Candidate Table Sizes on Staging ---');
    console.table(tableStats.rows.map(r => ({
      table_name: r.table_name,
      live_tuples: r.live_tuples,
      total_size: r.total_size,
      table_size: r.table_size,
      indexes_size: r.indexes_size
    })));

    // 5. Existing indexes on all candidate tables on staging
    const existingIndexes = await client.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = ANY($1)
      ORDER BY tablename, indexname;
    `, [CANDIDATE_TABLES]);
    console.log(`\n--- 5. Existing Indexes on Candidate Tables: ${existingIndexes.rows.length} indexes ---`);

    // 6. Foreign key constraint verification on staging
    const fks = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        tc.constraint_name,
        ccu.table_schema AS ref_schema,
        ccu.table_name AS ref_table,
        ccu.column_name AS ref_col,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = ANY($1)
        AND tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name;
    `, [CANDIDATE_TABLES]);
    console.log(`\n--- 6. FK Constraints on Staging Candidate Tables: ${fks.rows.length} FKs ---`);

    // Save full staging audit dump
    const auditData = {
      timestamp: new Date().toISOString(),
      targetHost: targetInfo.host,
      projectRef: targetInfo.projectRef,
      pgVersion: identity.rows[0].pg_version,
      baseline: baseline.rows[0].count,
      phase13bRecorded: phase13bRecord.rows.length > 0,
      collisions: collisionCheck.rows,
      tableStats: tableStats.rows,
      existingIndexes: existingIndexes.rows,
      fkConstraints: fks.rows
    };
    fs.writeFileSync('scratch/staging_audit_data.json', JSON.stringify(auditData, null, 2));
    console.log('\n[SAVED] Staging read-only catalog data saved to scratch/staging_audit_data.json');

  } finally {
    await client.end();
  }
}

runReadOnlyAudit().catch((err) => {
  console.error('READ-ONLY AUDIT ERROR:', err);
  process.exit(1);
});
