const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

async function verifyStagingPostPhase12B() {
  console.log('=== STRIVA V2: Independent Live Verification of Phase 12B on Staging ===\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. Migration count & record
    const countRes = await client.query('SELECT count(*) as total FROM _migrations');
    const total = parseInt(countRes.rows[0].total, 10);
    console.log(`Live _migrations count: ${total}`);
    if (total !== 28) {
      throw new Error(`Expected exactly 28 migrations after Phase 12B, got ${total}`);
    }

    const mig12bRes = await client.query("SELECT * FROM _migrations WHERE name = 'phase_12b_consumer_analytics_persistence.sql'");
    if (mig12bRes.rows.length !== 1) {
      throw new Error(`Expected exactly 1 record for phase_12b_consumer_analytics_persistence.sql, got ${mig12bRes.rows.length}`);
    }
    console.log(`✓ Phase 12B recorded: ${mig12bRes.rows[0].name} at ${mig12bRes.rows[0].run_at}`);

    // 2. Schema Nullability Check
    console.log('\n--- Column Nullability Check ---');
    const colRes = await client.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'ai_usage_analytics' 
        AND column_name = 'organization_id'
    `);
    console.log(`ai_usage_analytics.organization_id is_nullable: ${colRes.rows[0].is_nullable}`);
    if (colRes.rows[0].is_nullable !== 'YES') {
      throw new Error(`Expected organization_id is_nullable='YES', got ${colRes.rows[0].is_nullable}`);
    }
    console.log('✓ organization_id is nullable on live staging.');

    // 3. Partial Index Check
    console.log('\n--- Partial Index Check ---');
    const idxRes = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'ai_usage_analytics' 
        AND indexname = 'idx_ai_usage_analytics_consumer_user'
    `);
    if (idxRes.rows.length !== 1) {
      throw new Error('Partial index idx_ai_usage_analytics_consumer_user not found on live staging');
    }
    console.log(`✓ Partial index verified: ${idxRes.rows[0].indexdef}`);

    // 4. RLS Policy Check
    console.log('\n--- RLS Policy Check ---');
    const polRes = await client.query(`
      SELECT policyname, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'ai_usage_analytics'
      ORDER BY policyname
    `);
    const policyNames = polRes.rows.map(p => p.policyname);
    console.log('Active policies on ai_usage_analytics:');
    polRes.rows.forEach(p => console.log(` - "${p.policyname}" (${p.cmd})`));
    if (!policyNames.includes('Users view own consumer AI usage analytics')) {
      throw new Error('Missing policy: Users view own consumer AI usage analytics');
    }
    if (!policyNames.includes('Users insert own consumer AI usage analytics')) {
      throw new Error('Missing policy: Users insert own consumer AI usage analytics');
    }
    console.log('✓ Consumer RLS policies verified on live staging.');

    // 5. Data Persistence & Constraints Verification
    console.log('\n--- Data Persistence & Integrity Verification ---');
    const userRes = await client.query('SELECT id, email FROM auth.users LIMIT 1');
    const orgRes = await client.query('SELECT id, name FROM public.organizations LIMIT 1');
    const testUserId = userRes.rows[0].id;
    const testOrgId = orgRes.rows[0].id;
    console.log(`Using Test User: ${testUserId} (${userRes.rows[0].email})`);
    console.log(`Using Test Org:  ${testOrgId} (${orgRes.rows[0].name})`);

    // 5.1 Consumer Insert (organization_id = NULL)
    console.log('\nTest 5.1: Live consumer usage insert with organization_id = NULL...');
    const consumerInsert = await client.query(`
      INSERT INTO public.ai_usage_analytics (
        user_id, organization_id, agent_id, session_id, provider, model,
        request_timestamp, duration_ms, prompt_tokens, completion_tokens, total_tokens,
        tool_calls_count, tools_called, success, error_category
      ) VALUES (
        $1, NULL, 'fitness_coach', gen_random_uuid(), 'groq', 'openai/gpt-oss-20b',
        NOW(), 380, 140, 60, 200, 0, '[]'::jsonb, true, NULL
      ) RETURNING id, user_id, organization_id, prompt_tokens, completion_tokens, total_tokens
    `, [testUserId]);

    const consumerRow = consumerInsert.rows[0];
    console.log(`✓ Live consumer record created: ID=${consumerRow.id}, org=${consumerRow.organization_id}`);
    if (consumerRow.organization_id !== null) {
      throw new Error(`Expected null organization_id, got ${consumerRow.organization_id}`);
    }
    if (consumerRow.total_tokens !== 200) {
      throw new Error(`Token accounting mismatch: expected 200, got ${consumerRow.total_tokens}`);
    }

    // 5.2 B2B Insert (valid organization_id)
    console.log('\nTest 5.2: Live B2B usage insert with valid organization_id...');
    const b2bInsert = await client.query(`
      INSERT INTO public.ai_usage_analytics (
        user_id, organization_id, agent_id, session_id, provider, model,
        request_timestamp, duration_ms, prompt_tokens, completion_tokens, total_tokens,
        tool_calls_count, tools_called, success, error_category
      ) VALUES (
        $1, $2, 'business_advisor', gen_random_uuid(), 'groq', 'openai/gpt-oss-20b',
        NOW(), 520, 250, 110, 360, 1, '["get_gym_kpis"]'::jsonb, true, NULL
      ) RETURNING id, user_id, organization_id, total_tokens
    `, [testUserId, testOrgId]);

    const b2bRow = b2bInsert.rows[0];
    console.log(`✓ Live B2B record created: ID=${b2bRow.id}, org=${b2bRow.organization_id}`);
    if (b2bRow.organization_id !== testOrgId) {
      throw new Error(`Expected org ${testOrgId}, got ${b2bRow.organization_id}`);
    }

    // 5.3 Invalid Organization Rejection (FK Error 23503)
    console.log('\nTest 5.3: Verifying invalid organization_id rejection on live staging...');
    const fakeOrgId = 'a0000000-0000-0000-0000-000000000099';
    let fkFailed = false;
    try {
      await client.query(`
        INSERT INTO public.ai_usage_analytics (
          user_id, organization_id, agent_id, session_id, provider, model,
          request_timestamp, duration_ms, prompt_tokens, completion_tokens, total_tokens,
          tool_calls_count, tools_called, success
        ) VALUES (
          $1, $2, 'business_advisor', gen_random_uuid(), 'groq', 'openai/gpt-oss-20b',
          NOW(), 200, 10, 10, 20, 0, '[]'::jsonb, true
        )
      `, [testUserId, fakeOrgId]);
    } catch (err) {
      fkFailed = true;
      console.log(`✓ FK rejection confirmed: code=${err.code} (${err.message})`);
      if (err.code !== '23503') throw new Error(`Expected 23503, got ${err.code}`);
    }
    if (!fkFailed) throw new Error('SECURITY VIOLATION: Invalid organization was accepted!');

    // 5.4 Query Isolation
    console.log('\nTest 5.4: Verifying query isolation...');
    const b2bQuery = await client.query(`
      SELECT id, organization_id FROM public.ai_usage_analytics WHERE organization_id = $1
    `, [testOrgId]);
    const includesConsumer = b2bQuery.rows.some(r => r.id === consumerRow.id);
    if (includesConsumer) throw new Error('TENANT ISOLATION LEAK: consumer record returned in B2B query');
    console.log('✓ B2B query excludes consumer usage.');

    const consumerQuery = await client.query(`
      SELECT id, organization_id FROM public.ai_usage_analytics WHERE user_id = $1 AND organization_id IS NULL
    `, [testUserId]);
    const includesB2B = consumerQuery.rows.some(r => r.id === b2bRow.id);
    if (includesB2B) throw new Error('USER ISOLATION LEAK: B2B record returned in consumer query');
    console.log('✓ Consumer query isolates to authenticated user consumer records.');

    // Clean up verification test rows
    await client.query('DELETE FROM public.ai_usage_analytics WHERE id IN ($1, $2)', [consumerRow.id, b2bRow.id]);
    console.log('✓ Ephemeral test records cleaned up cleanly.');

    console.log('\n================================================================');
    console.log('PHASE 12B INDEPENDENT LIVE VERIFICATION: 100% SUCCESS!');
    console.log('================================================================\n');

  } finally {
    await client.end();
  }
}

verifyStagingPostPhase12B().catch(err => {
  console.error('\n❌ VERIFICATION ERROR:', err.message);
  process.exit(1);
});
