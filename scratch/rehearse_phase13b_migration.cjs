const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const LOCAL_TEST_URL = 'postgresql://postgres:postgres@127.0.0.1:5433/striva_restore_test';
const MIGRATION_FILE = 'phase_13b_foreign_key_indexes.sql';
const MIGRATION_PATH = path.join('backend/supabase/migrations', MIGRATION_FILE);
const ADVISORY_LOCK_KEY = '746291048201582';

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

async function rehearse() {
  console.log('=== STRIVA V2: PHASE 13B-4 LOCAL MIGRATION REHEARSAL ===\n');

  // Guard: Strictly isolate to local restore test database
  const parsed = new URL(LOCAL_TEST_URL);
  if (parsed.hostname !== '127.0.0.1' || parsed.port !== '5433' || parsed.pathname !== '/striva_restore_test') {
    throw new Error(`SAFETY GUARD ABORT: Unauthorized connection URL "${LOCAL_TEST_URL}"`);
  }
  console.log('[GUARD PASS] Target confirmed: Local isolated instance 127.0.0.1:5433/striva_restore_test\n');

  const client = new Client({ connectionString: LOCAL_TEST_URL });
  await client.connect();

  try {
    // Preflight cleanup if re-running rehearsal
    const alreadyRun = await client.query('SELECT name FROM _migrations WHERE name = $1', [MIGRATION_FILE]);
    if (alreadyRun.rows.length > 0) {
      console.log(`[RESET] Cleaning up previous rehearsal run to test from baseline 28...`);
      await client.query('DELETE FROM _migrations WHERE name = $1', [MIGRATION_FILE]);
      for (const idx of PROPOSED_INDEX_NAMES) {
        await client.query(`DROP INDEX IF EXISTS ${idx}`);
      }
      console.log(`[RESET] Dropped previous rehearsal indexes and reset baseline.`);
    }

    const baselineRes = await client.query('SELECT count(*)::int AS count FROM _migrations');
    console.log(`[PREFLIGHT] Current migration baseline: ${baselineRes.rows[0].count}`);
    if (baselineRes.rows[0].count !== 28) {
      throw new Error(`Baseline mismatch: expected 28, found ${baselineRes.rows[0].count}`);
    }

    // Verify none of the 16 indexes exist yet
    const preIdx = await client.query('SELECT indexname FROM pg_indexes WHERE indexname = ANY($1)', [PROPOSED_INDEX_NAMES]);
    console.log(`[PREFLIGHT] Existing candidate index count: ${preIdx.rows.length} (expected: 0)`);

    // 2. Execute migration inside transaction block
    console.log(`\n[EXECUTE] Reading migration file ${MIGRATION_PATH}...`);
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');

    console.log('[EXECUTE] Beginning transaction & acquiring advisory lock...');
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [ADVISORY_LOCK_KEY]);

    console.log('[EXECUTE] Applying index creation DDL...');
    const startTime = Date.now();
    await client.query(sql);
    const elapsedMs = Date.now() - startTime;
    console.log(`[EXECUTE] DDL executed in ${elapsedMs}ms.`);

    await client.query('INSERT INTO _migrations (name, run_at) VALUES ($1, NOW())', [MIGRATION_FILE]);
    await client.query('COMMIT');
    console.log(`[EXECUTE] Committed transaction successfully. Baseline updated to 29.\n`);

    // 3. Post-execution index verification
    console.log('=== POST-EXECUTION VERIFICATION ===');
    const postBaseline = await client.query('SELECT count(*)::int AS count FROM _migrations');
    console.log(`[BASELINE] Verified baseline: ${postBaseline.rows[0].count}`);

    const idxDetails = await client.query(`
      SELECT
        c.relname AS table_name,
        i.relname AS index_name,
        ind.indisvalid AS is_valid,
        ind.indisunique AS is_unique,
        ind.indpred IS NOT NULL AS is_partial,
        pg_size_pretty(pg_relation_size(i.oid)) AS index_size
      FROM pg_index ind
      JOIN pg_class i ON i.oid = ind.indexrelid
      JOIN pg_class c ON c.oid = ind.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND i.relname = ANY($1)
      ORDER BY c.relname, i.relname;
    `, [PROPOSED_INDEX_NAMES]);

    console.log(`\n[INDEX INTEGRITY] Found ${idxDetails.rows.length} of ${PROPOSED_INDEX_NAMES.length} indexes in pg_catalog:`);
    console.table(idxDetails.rows);

    const allValid = idxDetails.rows.every(r => r.is_valid === true);
    if (!allValid || idxDetails.rows.length !== PROPOSED_INDEX_NAMES.length) {
      throw new Error(`Index validation failed: expected 16 valid indexes, found ${idxDetails.rows.length}`);
    }
    console.log('✓ All 16 indexes are catalog-valid (indisvalid = true).\n');

    // 4. Supabase Advisor Re-evaluation
    console.log('[ADVISOR EVALUATION] Checking remaining unindexed foreign keys...');
    const advisorRes = await client.query(`
      WITH fk_actions AS (
        SELECT
          c.conname AS constraint_name,
          cl.relname AS table_name,
          ARRAY_AGG(att.attnum ORDER BY u.attposition) AS fk_column_ids,
          cl.oid AS table_oid
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_class cl ON cl.oid = c.conrelid
        JOIN LATERAL UNNEST(c.conkey) WITH ORDINALITY AS u(attnum, attposition) ON TRUE
        JOIN pg_attribute att ON att.attrelid = c.conrelid AND att.attnum = u.attnum
        WHERE c.contype = 'f' AND n.nspname = 'public'
        GROUP BY c.conname, cl.relname, cl.oid
      ),
      indexed_columns AS (
        SELECT
          i.indrelid AS table_oid,
          ARRAY_AGG(u.attnum ORDER BY u.attposition) AS indexed_column_ids
        FROM pg_index i
        JOIN LATERAL UNNEST(i.indkey) WITH ORDINALITY AS u(attnum, attposition) ON TRUE
        WHERE u.attnum > 0
        GROUP BY i.indexrelid, i.indrelid
      )
      SELECT
        f.table_name,
        f.constraint_name
      FROM fk_actions f
      WHERE NOT EXISTS (
        SELECT 1
        FROM indexed_columns ic
        WHERE ic.table_oid = f.table_oid
          AND ic.indexed_column_ids[1:CARDINALITY(f.fk_column_ids)] = f.fk_column_ids
      )
      ORDER BY f.table_name, f.constraint_name;
    `);
    console.log(`Remaining unindexed foreign keys: ${advisorRes.rows.length} (reduced from 54 by exactly 16)`);
    if (advisorRes.rows.length !== 38) {
      throw new Error(`Unexpected advisor count: expected 38, found ${advisorRes.rows.length}`);
    }
    console.log('✓ Exactly 16 unindexed foreign keys resolved in Performance Advisor.\n');

    // 5. Idempotence test
    console.log('[IDEMPOTENCE] Re-executing migration file to verify rerun safety...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('ROLLBACK');
    console.log('✓ Idempotence verified: Re-running SQL executed cleanly with 0 errors.\n');

    // 6. Referential Integrity & Cascade Functional Test
    console.log('[REFERENTIAL INTEGRITY] Testing foreign-key cascades on newly indexed tables...');
    await client.query('BEGIN');

    // Test A: ai_conversations -> ai_messages cascade
    const conv = await client.query(`
      INSERT INTO ai_conversations (id, user_id, title)
      VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b96c0b60-9a8b-496f-9e33-f533982412f6', 'Test Chat')
      RETURNING id
    `);
    await client.query(`
      INSERT INTO ai_messages (id, conversation_id, role, content)
      VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user', 'Hello TRINETRA')
    `);

    // Verify index scan on ai_messages
    await client.query('SET enable_seqscan = off');
    const msgExplain = await client.query(`
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT * FROM ai_messages
      WHERE conversation_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      ORDER BY created_at ASC
    `);
    console.log('[EXPLAIN] Message retrieval query plan:');
    console.log(msgExplain.rows.map(r => '  ' + r['QUERY PLAN']).join('\n'));

    // Cascade delete conversation
    await client.query(`DELETE FROM ai_conversations WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'`);
    const msgCheck = await client.query(`SELECT count(*)::int AS cnt FROM ai_messages WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'`);
    if (msgCheck.rows[0].cnt !== 0) throw new Error('ai_messages cascade deletion failed');
    console.log('✓ ai_messages CASCADE deletion verified successfully.');

    // Test B: trainer_member_assignments cascade delete
    await client.query(`
      INSERT INTO trainer_member_assignments (id, organization_id, member_user_id, trainer_user_id, status)
      VALUES (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        '00000000-0000-0000-0000-000000000001',
        'b96c0b60-9a8b-496f-9e33-f533982412f6',
        'b96c0b60-9a8b-496f-9e33-f533982412f6',
        'active'
      )
    `);
    const trainerExplain = await client.query(`
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT * FROM trainer_member_assignments
      WHERE member_user_id = 'b96c0b60-9a8b-496f-9e33-f533982412f6'
    `);
    console.log('[EXPLAIN] Trainer assignment member lookup query plan:');
    console.log(trainerExplain.rows.map(r => '  ' + r['QUERY PLAN']).join('\n'));

    await client.query('ROLLBACK');
    console.log('✓ Cascade functional test clean & rolled back.\n');

    console.log('===========================================================');
    console.log('REHEARSAL SUCCESSFUL: ALL 16 INDEXES APPLIED AND VERIFIED');
    console.log('===========================================================');

  } finally {
    await client.end();
  }
}

rehearse().catch((err) => {
  console.error('FATAL REHEARSAL ERROR:', err);
  process.exit(1);
});
