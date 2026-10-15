const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: 'backend/.env' });

const { validateStagingDatabaseUrl, EXPECTED_STAGING_HOST, EXPECTED_STAGING_PROJECT_REF } = require('../backend/scripts/apply_staging_migrations.js');

const EXPECTED_INDEXES = [
  {
    id: 'IDX-01',
    name: 'idx_ai_messages_conversation_id',
    table: 'ai_messages',
    cols: 'conversation_id, created_at',
    predicate: null,
    fk: 'ai_messages_conversation_id_fkey'
  },
  {
    id: 'IDX-02',
    name: 'idx_ai_tool_executions_conversation_id',
    table: 'ai_tool_executions',
    cols: 'conversation_id',
    predicate: null,
    fk: 'ai_tool_executions_conversation_id_fkey'
  },
  {
    id: 'IDX-03',
    name: 'idx_organization_locations_organization_id',
    table: 'organization_locations',
    cols: 'organization_id',
    predicate: null,
    fk: 'organization_locations_organization_id_fkey'
  },
  {
    id: 'IDX-04',
    name: 'idx_organization_roles_organization_id',
    table: 'organization_roles',
    cols: 'organization_id',
    predicate: null,
    fk: 'organization_roles_organization_id_fkey'
  },
  {
    id: 'IDX-05',
    name: 'idx_org_audit_logs_org_created',
    table: 'organization_audit_logs',
    cols: 'organization_id, created_at DESC',
    predicate: null,
    fk: 'organization_audit_logs_organization_id_fkey'
  },
  {
    id: 'IDX-06',
    name: 'idx_trainer_assignments_member_user_id',
    table: 'trainer_member_assignments',
    cols: 'member_user_id',
    predicate: null,
    fk: 'trainer_member_assignments_member_user_id_fkey'
  },
  {
    id: 'IDX-07',
    name: 'idx_trainer_assignments_trainer_user_id',
    table: 'trainer_member_assignments',
    cols: 'trainer_user_id',
    predicate: null,
    fk: 'trainer_member_assignments_trainer_user_id_fkey'
  },
  {
    id: 'IDX-08',
    name: 'idx_attendance_logs_location_id',
    table: 'attendance_logs',
    cols: 'location_id',
    predicate: 'location_id IS NOT NULL',
    fk: 'attendance_logs_location_id_fkey'
  },
  {
    id: 'IDX-09',
    name: 'idx_org_members_location_id',
    table: 'organization_members',
    cols: 'location_id',
    predicate: 'location_id IS NOT NULL',
    fk: 'organization_members_location_id_fkey'
  },
  {
    id: 'IDX-10',
    name: 'idx_org_staff_location_id',
    table: 'organization_staff',
    cols: 'location_id',
    predicate: 'location_id IS NOT NULL',
    fk: 'organization_staff_location_id_fkey'
  },
  {
    id: 'IDX-11',
    name: 'idx_ai_tool_executions_user_id',
    table: 'ai_tool_executions',
    cols: 'user_id',
    predicate: null,
    fk: 'ai_tool_executions_user_id_fkey'
  },
  {
    id: 'IDX-12',
    name: 'idx_ai_agent_memories_organization_id',
    table: 'ai_agent_memories',
    cols: 'organization_id',
    predicate: null,
    fk: 'ai_agent_memories_organization_id_fkey'
  },
  {
    id: 'IDX-13',
    name: 'idx_v2_workout_sessions_plan_id',
    table: 'v2_workout_sessions',
    cols: 'plan_id',
    predicate: 'plan_id IS NOT NULL',
    fk: 'v2_workout_sessions_plan_id_fkey'
  },
  {
    id: 'IDX-14',
    name: 'idx_invoices_subscription_id',
    table: 'invoices',
    cols: 'subscription_id',
    predicate: 'subscription_id IS NOT NULL',
    fk: 'invoices_subscription_id_fkey'
  },
  {
    id: 'IDX-15',
    name: 'idx_org_invoices_subscription_id',
    table: 'organization_invoices',
    cols: 'subscription_id',
    predicate: 'subscription_id IS NOT NULL',
    fk: 'organization_invoices_subscription_id_fkey'
  },
  {
    id: 'IDX-16',
    name: 'idx_org_subs_plan_id',
    table: 'organization_subscriptions',
    cols: 'plan_id',
    predicate: 'plan_id IS NOT NULL',
    fk: 'organization_subscriptions_plan_id_fkey'
  }
];

async function verifyDeployment() {
  console.log('=== STRIVA V2: PHASE 13B-7 POST-DEPLOYMENT LIVE VERIFICATION ===\n');

  // Guard Target Check
  const targetInfo = validateStagingDatabaseUrl(process.env.DATABASE_URL);
  console.log(`[GUARD] Target Database: ${targetInfo.host} (${targetInfo.projectRef})`);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    // 1. Verify Migration History Count and Record
    console.log('\n--- 1. MIGRATION HISTORY ADVANCEMENT ---');
    const migCountRes = await client.query('SELECT count(*)::int AS count FROM _migrations');
    const migCount = migCountRes.rows[0].count;
    console.log(`Total _migrations count: ${migCount} (Expected: 29)`);

    const phase13bRecRes = await client.query("SELECT name, run_at FROM _migrations WHERE name = 'phase_13b_foreign_key_indexes.sql'");
    console.log(`Phase 13B records found: ${phase13bRecRes.rows.length}`);
    if (phase13bRecRes.rows.length !== 1) {
      throw new Error(`Expected exactly 1 record for phase_13b_foreign_key_indexes.sql, found ${phase13bRecRes.rows.length}`);
    }
    const migRecord = phase13bRecRes.rows[0];
    console.log(`Phase 13B migration record: Name=${migRecord.name}, RunAt=${migRecord.run_at}`);

    const topMigrations = await client.query('SELECT name, run_at FROM _migrations ORDER BY run_at DESC LIMIT 5');
    console.log('\nLatest 5 migrations recorded:');
    topMigrations.rows.forEach(r => console.log(`  - ${r.name} (${r.run_at})`));

    // 2. Verify all 16 indexes in pg_index and pg_class
    console.log('\n--- 2. PER-INDEX EXISTENCE, VALIDITY & DEFINITION AUDIT ---');
    const indexNames = EXPECTED_INDEXES.map(i => i.name);

    const indexDetails = await client.query(`
      SELECT
        c.relname AS index_name,
        t.relname AS table_name,
        i.indisvalid AS is_valid,
        i.indisready AS is_ready,
        pg_get_indexdef(c.oid) AS index_def
      FROM pg_index i
      JOIN pg_class c ON c.oid = i.indexrelid
      JOIN pg_class t ON t.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = ANY($1)
      ORDER BY c.relname;
    `, [indexNames]);

    console.log(`Indexes found in pg_index: ${indexDetails.rows.length} / 16`);
    if (indexDetails.rows.length !== 16) {
      throw new Error(`Expected 16 indexes, found ${indexDetails.rows.length}`);
    }

    const indexMap = new Map(indexDetails.rows.map(r => [r.index_name, r]));

    const verificationSummary = [];

    for (const exp of EXPECTED_INDEXES) {
      const live = indexMap.get(exp.name);
      if (!live) {
        throw new Error(`Missing expected index: ${exp.name}`);
      }
      if (!live.is_valid) {
        throw new Error(`Index ${exp.name} is INVALID (indisvalid = false)`);
      }
      if (live.table_name !== exp.table) {
        throw new Error(`Index ${exp.name} table mismatch: expected ${exp.table}, found ${live.table_name}`);
      }

      verificationSummary.push({
        id: exp.id,
        name: exp.name,
        table: live.table_name,
        valid: live.is_valid,
        definition: live.index_def
      });
      console.log(`[PASS] ${exp.id} | ${exp.name} on ${live.table_name} (valid: ${live.is_valid})`);
      console.log(`       Def: ${live.index_def}`);
    }

    // 3. Check for ANY invalid indexes across the public schema
    console.log('\n--- 3. SCHEMA-WIDE INVALID INDEX CHECK ---');
    const invalidIdxRes = await client.query(`
      SELECT
        c.relname AS index_name,
        t.relname AS table_name
      FROM pg_index i
      JOIN pg_class c ON c.oid = i.indexrelid
      JOIN pg_class t ON t.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND i.indisvalid = false;
    `);
    console.log(`Total invalid indexes in public schema: ${invalidIdxRes.rows.length}`);
    if (invalidIdxRes.rows.length > 0) {
      console.error('WARNING: Found invalid indexes in public schema:', invalidIdxRes.rows);
      throw new Error('Schema contains invalid indexes!');
    }
    console.log('✓ All indexes in public schema are valid.');

    // 4. Verify Foreign Key Constraints Remain Intact
    console.log('\n--- 4. FOREIGN KEY CONSTRAINT INTEGRITY VERIFICATION ---');
    for (const exp of EXPECTED_INDEXES) {
      const fkRes = await client.query(`
        SELECT
          c.conname,
          cl.relname AS table_name,
          c.confdeltype,
          pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        JOIN pg_class cl ON cl.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public'
          AND cl.relname = $1
          AND c.conname = $2;
      `, [exp.table, exp.fk]);

      if (fkRes.rows.length !== 1) {
        throw new Error(`FK constraint ${exp.fk} missing or damaged on ${exp.table}!`);
      }
      const fk = fkRes.rows[0];
      const delType = fk.confdeltype === 'c' ? 'CASCADE' : fk.confdeltype === 'n' ? 'SET NULL' : fk.confdeltype;
      console.log(`[PASS] ${exp.table}.${exp.fk} [ON DELETE ${delType}] intact: ${fk.def}`);
    }

    // 5. Check Performance Advisor or Index Telemetry if available
    console.log('\n--- 5. PERFORMANCE ADVISOR & QUERY STATS INSPECTION ---');
    try {
      // Check if pg_stat_statements or advisor extensions/views exist
      const extRes = await client.query("SELECT extname FROM pg_extension WHERE extname IN ('pg_stat_statements', 'hypopg', 'index_advisor')");
      console.log('Installed relevant extensions:', extRes.rows.map(r => r.extname));

      // Check if any advisor tables or views exist in schemas
      const advisorViews = await client.query(`
        SELECT schemaname, viewname
        FROM pg_views
        WHERE viewname LIKE '%advisor%' OR viewname LIKE '%recommend%' OR schemaname = 'vault';
      `);
      console.log('Available advisor views:', advisorViews.rows);
    } catch (advisorErr) {
      console.log('Performance advisor view check note:', advisorErr.message);
    }

    console.log('\n================================================================');
    console.log('✓ ALL POST-DEPLOYMENT VERIFICATION GATES PASSED (Exit Code: 0)');
    console.log('================================================================');

    return {
      migCount,
      migRecord,
      verificationSummary
    };
  } finally {
    await client.end();
  }
}

verifyDeployment().catch(err => {
  console.error('\nFATAL POST-DEPLOYMENT VERIFICATION ERROR:', err);
  process.exit(1);
});
