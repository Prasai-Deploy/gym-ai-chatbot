const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:5433/striva_restore_test';
const MIGRATION_LOCK_KEY = '746291048201582';

async function runLocalRehearsalAndVerification() {
  console.log('================================================================');
  console.log('STRIVA V2 - Phase 12A & 12B Local Migration Rehearsal & Testing');
  console.log('Target: Local restored disposable PostgreSQL (port 5433)');
  console.log('================================================================\n');

  const client = new Client({ connectionString: LOCAL_DB_URL });
  await client.connect();

  try {
    // ------------------------------------------------------------------
    // Reset to Baseline 26 for clean rehearsal
    // ------------------------------------------------------------------
    await client.query("DELETE FROM _migrations WHERE name IN ('phase_12_legacy_routine_hardening.sql', 'phase_12b_consumer_analytics_persistence.sql')");

    // Revert column nullability if it was already altered in a prior run
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'ai_usage_analytics' 
            AND column_name = 'organization_id' 
            AND is_nullable = 'YES'
        ) THEN
          -- Delete test records with null org_id before reverting constraint
          DELETE FROM public.ai_usage_analytics WHERE organization_id IS NULL;
          ALTER TABLE public.ai_usage_analytics ALTER COLUMN organization_id SET NOT NULL;
        END IF;
      END $$;
    `);

    // Drop partial index if exists
    await client.query('DROP INDEX IF EXISTS public.idx_ai_usage_analytics_consumer_user');

    // Drop consumer policies if exist
    await client.query('DROP POLICY IF EXISTS "Users view own consumer AI usage analytics" ON public.ai_usage_analytics');
    await client.query('DROP POLICY IF EXISTS "Users insert own consumer AI usage analytics" ON public.ai_usage_analytics');

    // ------------------------------------------------------------------
    // Step 0: Preflight verification
    // ------------------------------------------------------------------
    console.log('[STEP 0] Baseline Verification');
    const initMigCount = await client.query('SELECT count(*) FROM _migrations');
    console.log(`Initial _migrations count: ${initMigCount.rows[0].count}`);
    if (parseInt(initMigCount.rows[0].count, 10) !== 26) {
      throw new Error(`Expected baseline 26 migrations, found ${initMigCount.rows[0].count}`);
    }

    const initCol = await client.query(`
      SELECT is_nullable FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'ai_usage_analytics' AND column_name = 'organization_id'
    `);
    console.log(`Initial ai_usage_analytics.organization_id is_nullable: ${initCol.rows[0].is_nullable}`);
    if (initCol.rows[0].is_nullable !== 'NO') {
      throw new Error(`Expected organization_id is_nullable = 'NO' at baseline, got ${initCol.rows[0].is_nullable}`);
    }

    // ------------------------------------------------------------------
    // Step 1: Apply Phase 12A (phase_12_legacy_routine_hardening.sql)
    // ------------------------------------------------------------------
    console.log('\n[STEP 1] Applying Phase 12A Routine Hardening Migration...');
    const mig12aName = 'phase_12_legacy_routine_hardening.sql';
    const mig12aPath = path.join(__dirname, '..', 'backend', 'supabase', 'migrations', mig12aName);
    const mig12aSql = fs.readFileSync(mig12aPath, 'utf8');

    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY]);
    await client.query(mig12aSql);
    await client.query('INSERT INTO _migrations (name, run_at) VALUES ($1, NOW())', [mig12aName]);
    await client.query('COMMIT');
    console.log(`✓ Successfully applied ${mig12aName}`);

    // Verify baseline advanced to 27
    const migCountAfter12a = await client.query('SELECT count(*) FROM _migrations');
    console.log(`Current _migrations count: ${migCountAfter12a.rows[0].count}`);
    if (parseInt(migCountAfter12a.rows[0].count, 10) !== 27) {
      throw new Error(`Expected baseline 27 after Phase 12A, got ${migCountAfter12a.rows[0].count}`);
    }

    // Verify routine security properties
    const routineChecks = await client.query(`
      SELECT p.proname, p.prosecdef, pg_catalog.pg_get_function_identity_arguments(p.oid) as args,
             p.proconfig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN ('get_admin_role', 'is_admin', 'update_membership_statuses', 'update_modified_column', 'update_updated_at_column')
      ORDER BY p.proname
    `);
    console.log('Phase 12A Routine Properties:');
    for (const r of routineChecks.rows) {
      console.log(` - ${r.proname}(${r.args}): secdef=${r.prosecdef}, config=${JSON.stringify(r.proconfig)}`);
      // All 5 routines must be SECURITY INVOKER
      if (r.prosecdef !== false) {
        throw new Error(`${r.proname} must be SECURITY INVOKER (prosecdef=false)`);
      }
      if (!r.proconfig || !r.proconfig.includes('search_path=pg_catalog, pg_temp')) {
        throw new Error(`${r.proname} must have pinned search_path=pg_catalog, pg_temp`);
      }
    }
    console.log('✓ All 5 routines verified: SECURITY INVOKER with search_path=pg_catalog, pg_temp.');

    // ------------------------------------------------------------------
    // Step 2: Apply Phase 12B (phase_12b_consumer_analytics_persistence.sql)
    // ------------------------------------------------------------------
    console.log('\n[STEP 2] Applying Phase 12B Consumer Analytics Migration...');
    const mig12bName = 'phase_12b_consumer_analytics_persistence.sql';
    const mig12bPath = path.join(__dirname, '..', 'backend', 'supabase', 'migrations', mig12bName);
    const mig12bSql = fs.readFileSync(mig12bPath, 'utf8');

    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY]);
    await client.query(mig12bSql);
    await client.query('INSERT INTO _migrations (name, run_at) VALUES ($1, NOW())', [mig12bName]);
    await client.query('COMMIT');
    console.log(`✓ Successfully applied ${mig12bName}`);

    // Verify baseline advanced to 28
    const migCountAfter12b = await client.query('SELECT count(*) FROM _migrations');
    console.log(`Current _migrations count: ${migCountAfter12b.rows[0].count}`);
    if (parseInt(migCountAfter12b.rows[0].count, 10) !== 28) {
      throw new Error(`Expected baseline 28 after Phase 12B, got ${migCountAfter12b.rows[0].count}`);
    }

    // Verify column nullability
    const colCheck = await client.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'ai_usage_analytics' 
        AND column_name = 'organization_id'
    `);
    console.log(`ai_usage_analytics.organization_id is_nullable: ${colCheck.rows[0].is_nullable}`);
    if (colCheck.rows[0].is_nullable !== 'YES') {
      throw new Error('organization_id must be nullable in ai_usage_analytics');
    }

    // Verify partial index
    const idxCheck = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'ai_usage_analytics' 
        AND indexname = 'idx_ai_usage_analytics_consumer_user'
    `);
    console.log(`Partial index created: ${idxCheck.rows.length === 1}`);
    if (idxCheck.rows.length !== 1) {
      throw new Error('Partial index idx_ai_usage_analytics_consumer_user not found');
    }
    console.log(` - Index definition: ${idxCheck.rows[0].indexdef}`);

    // Verify RLS policies
    const polCheck = await client.query(`
      SELECT policyname, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'ai_usage_analytics'
      ORDER BY policyname
    `);
    console.log('AI Usage Analytics RLS Policies:');
    polCheck.rows.forEach(p => console.log(` - "${p.policyname}" (${p.cmd})`));
    const policyNames = polCheck.rows.map(p => p.policyname);
    if (!policyNames.includes('Users view own consumer AI usage analytics')) {
      throw new Error('Missing policy: Users view own consumer AI usage analytics');
    }
    if (!policyNames.includes('Users insert own consumer AI usage analytics')) {
      throw new Error('Missing policy: Users insert own consumer AI usage analytics');
    }

    // ------------------------------------------------------------------
    // Step 3: Data Integrity, Constraints, and Foreign Key Behavior
    // ------------------------------------------------------------------
    console.log('\n[STEP 3] Testing Constraints, Foreign Keys & Persistence...');

    // Get an existing test user and organization from the database
    const userRes = await client.query('SELECT id, email FROM auth.users LIMIT 2');
    if (userRes.rows.length === 0) {
      throw new Error('No users found in auth.users for testing');
    }
    const testUserA = userRes.rows[0].id;
    const testUserB = userRes.rows.length > 1 ? userRes.rows[1].id : null;
    console.log(`Using Test User A: ${testUserA}`);
    if (testUserB) console.log(`Using Test User B: ${testUserB}`);

    const orgRes = await client.query('SELECT id, name FROM public.organizations LIMIT 1');
    if (orgRes.rows.length === 0) {
      throw new Error('No organization found in public.organizations for testing');
    }
    const testOrgId = orgRes.rows[0].id;
    console.log(`Using Test Organization: ${testOrgId} (${orgRes.rows[0].name})`);

    // Test 3.1: Consumer usage insert with organization_id NULL
    console.log('Test 3.1: Inserting consumer usage record with organization_id = NULL...');
    const consumerInsert = await client.query(`
      INSERT INTO public.ai_usage_analytics (
        user_id, organization_id, agent_id, session_id, provider, model,
        request_timestamp, duration_ms, prompt_tokens, completion_tokens, total_tokens,
        tool_calls_count, tools_called, success, error_category
      ) VALUES (
        $1, NULL, 'fitness_coach', gen_random_uuid(), 'groq', 'llama-3.3-70b-versatile',
        NOW(), 450, 120, 85, 205,
        0, '[]'::jsonb, true, NULL
      ) RETURNING id, user_id, organization_id, prompt_tokens, completion_tokens, total_tokens, success
    `, [testUserA]);

    const consumerRow = consumerInsert.rows[0];
    console.log(`✓ Consumer usage record created with ID: ${consumerRow.id}, org: ${consumerRow.organization_id}`);
    if (consumerRow.organization_id !== null) {
      throw new Error(`Expected organization_id to be null, got ${consumerRow.organization_id}`);
    }
    if (consumerRow.prompt_tokens !== 120 || consumerRow.completion_tokens !== 85 || consumerRow.total_tokens !== 205) {
      throw new Error(`Token accounting mismatch: prompt=${consumerRow.prompt_tokens}, comp=${consumerRow.completion_tokens}, total=${consumerRow.total_tokens}`);
    }

    // Test 3.2: B2B usage insert with valid organization_id
    console.log('Test 3.2: Inserting B2B usage record with valid organization_id...');
    const b2bInsert = await client.query(`
      INSERT INTO public.ai_usage_analytics (
        user_id, organization_id, agent_id, session_id, provider, model,
        request_timestamp, duration_ms, prompt_tokens, completion_tokens, total_tokens,
        tool_calls_count, tools_called, success, error_category
      ) VALUES (
        $1, $2, 'business_advisor', gen_random_uuid(), 'groq', 'llama-3.3-70b-versatile',
        NOW(), 620, 310, 140, 450,
        1, '["get_membership_analytics"]'::jsonb, true, NULL
      ) RETURNING id, user_id, organization_id, total_tokens, success
    `, [testUserA, testOrgId]);

    const b2bRow = b2bInsert.rows[0];
    console.log(`✓ B2B usage record created with ID: ${b2bRow.id}, org: ${b2bRow.organization_id}`);
    if (b2bRow.organization_id !== testOrgId) {
      throw new Error(`Expected organization_id ${testOrgId}, got ${b2bRow.organization_id}`);
    }

    // Test 3.3: Invalid organization_id MUST fail foreign key constraint (23503)
    console.log('Test 3.3: Verifying invalid organization_id is rejected by FK constraint...');
    const fakeOrgId = 'a0000000-0000-0000-0000-000000000099';
    let fkFailed = false;
    try {
      await client.query(`
        INSERT INTO public.ai_usage_analytics (
          user_id, organization_id, agent_id, session_id, provider, model,
          request_timestamp, duration_ms, prompt_tokens, completion_tokens, total_tokens,
          tool_calls_count, tools_called, success, error_category
        ) VALUES (
          $1, $2, 'business_advisor', gen_random_uuid(), 'groq', 'llama-3.3-70b-versatile',
          NOW(), 200, 50, 50, 100, 0, '[]'::jsonb, true, NULL
        )
      `, [testUserA, fakeOrgId]);
    } catch (err) {
      fkFailed = true;
      console.log(`✓ FK rejection caught successfully: code=${err.code} (${err.message})`);
      if (err.code !== '23503') {
        throw new Error(`Expected PostgreSQL foreign key error 23503, got ${err.code}`);
      }
    }
    if (!fkFailed) {
      throw new Error('SECURITY VIOLATION: Invalid organization_id was accepted without foreign key error!');
    }

    // Test 3.4: user_id NOT NULL check
    console.log('Test 3.4: Verifying user_id NOT NULL constraint...');
    let notNullFailed = false;
    try {
      await client.query(`
        INSERT INTO public.ai_usage_analytics (
          user_id, organization_id, agent_id, session_id, provider, model,
          request_timestamp, duration_ms, prompt_tokens, completion_tokens, total_tokens,
          tool_calls_count, tools_called, success, error_category
        ) VALUES (
          NULL, NULL, 'fitness_coach', gen_random_uuid(), 'groq', 'llama-3.3-70b-versatile',
          NOW(), 100, 10, 10, 20, 0, '[]'::jsonb, true, NULL
        )
      `);
    } catch (err) {
      notNullFailed = true;
      console.log(`✓ NOT NULL rejection caught successfully: code=${err.code}`);
      if (err.code !== '23502') {
        throw new Error(`Expected 23502 (not_null_violation), got ${err.code}`);
      }
    }
    if (!notNullFailed) {
      throw new Error('SECURITY VIOLATION: NULL user_id was accepted!');
    }

    // ------------------------------------------------------------------
    // Step 4: Verify Tenant and Consumer Query Isolation
    // ------------------------------------------------------------------
    console.log('\n[STEP 4] Testing Query & Tenant Isolation Logic...');

    // 4.1 B2B query isolation: querying an organization should NEVER return consumer records
    const b2bQuery = await client.query(`
      SELECT id, user_id, organization_id, total_tokens 
      FROM public.ai_usage_analytics 
      WHERE organization_id = $1
    `, [testOrgId]);
    console.log(`B2B query for org ${testOrgId} returned ${b2bQuery.rows.length} records.`);
    for (const r of b2bQuery.rows) {
      if (r.organization_id !== testOrgId) {
        throw new Error(`Tenant leak: row with org ${r.organization_id} returned in query for ${testOrgId}`);
      }
    }
    const containsConsumerInOrg = b2bQuery.rows.some(r => r.id === consumerRow.id);
    if (containsConsumerInOrg) {
      throw new Error('TENANT ISOLATION FAILURE: Consumer usage record returned in B2B organization query!');
    }
    console.log('✓ B2B query strictly isolates to organization_id, consumer records excluded.');

    // 4.2 Consumer query isolation: querying user's consumer usage
    const consumerQuery = await client.query(`
      SELECT id, user_id, organization_id, total_tokens 
      FROM public.ai_usage_analytics 
      WHERE user_id = $1 AND organization_id IS NULL
    `, [testUserA]);
    console.log(`Consumer query for user ${testUserA} returned ${consumerQuery.rows.length} records.`);
    for (const r of consumerQuery.rows) {
      if (r.organization_id !== null) {
        throw new Error(`Consumer leak: non-null organization_id returned in consumer query`);
      }
      if (r.user_id !== testUserA) {
        throw new Error(`User leak: record belonging to ${r.user_id} returned in query for ${testUserA}`);
      }
    }
    console.log('✓ Consumer query strictly isolates to user_id and organization_id IS NULL.');

    // ------------------------------------------------------------------
    // Step 5: Verify Idempotence and Re-run Safety
    // ------------------------------------------------------------------
    console.log('\n[STEP 5] Testing Re-run & Idempotence Behavior...');
    // Running Phase 12B again should succeed without error
    await client.query('BEGIN');
    await client.query(mig12bSql);
    await client.query('COMMIT');
    console.log('✓ Phase 12B migration executed cleanly a second time (idempotent DDL & policy definitions).');

    // ------------------------------------------------------------------
    // Step 6: Verify Transaction Rollback Behavior
    // ------------------------------------------------------------------
    console.log('\n[STEP 6] Testing Transaction Rollback on Error...');
    let rolledBack = false;
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY]);
      await client.query("INSERT INTO _migrations (name, run_at) VALUES ('phase_test_rollback.sql', NOW())");
      // Simulate fatal failure
      await client.query('SELECT * FROM non_existent_table_for_rollback_test');
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      rolledBack = true;
      console.log('✓ Transaction error caught and rolled back safely.');
    }
    if (!rolledBack) {
      throw new Error('Expected rollback test to fail and roll back');
    }

    const checkRollback = await client.query("SELECT * FROM _migrations WHERE name = 'phase_test_rollback.sql'");
    if (checkRollback.rows.length !== 0) {
      throw new Error('Rollback failed: migration row was committed');
    }
    console.log('✓ Confirmed rollback left no trace in _migrations.');

    console.log('\n================================================================');
    console.log('ALL LOCAL DATABASE TESTS & ASSERTIONS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ REHEARSAL ERROR:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runLocalRehearsalAndVerification();
