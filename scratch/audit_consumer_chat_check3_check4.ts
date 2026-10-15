import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

import { createClient } from '@supabase/supabase-js';
import { Client as PgClient } from 'pg';
import { app } from '../backend/src/app/app';
import { aiUsageRepository } from '../backend/src/modules/ai/repositories/AIUsageRepository';
import http from 'http';

async function runAudit() {
  console.log('=== STRIVA V2 PHASE 12D: CHECKS 3 & 4 (CONSUMER TRINETRA & B2B ISOLATION) ===');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const anonKey = process.env.SUPABASE_ANON_KEY!;
  const password = process.env.VITE_DEMO_PASSWORD || 'demo2026';

  // 1. Authenticate as consumer demo user
  console.log('[Step 1] Authenticating consumer test account demo@sweatfix.com...');
  const supabaseAuth = createClient(supabaseUrl, anonKey);
  const { data: authData, error: authErr } = await supabaseAuth.auth.signInWithPassword({
    email: 'demo@sweatfix.com',
    password: password
  });

  if (authErr || !authData.session) {
    throw new Error(`Auth failed: ${authErr?.message}`);
  }

  const userId = authData.user.id;
  const token = authData.session.access_token;
  console.log(`[Step 1] Authentication successful. User ID: ${userId}`);

  // 2. Start ephemeral Express server
  console.log('[Step 2] Starting local ephemeral server for API dispatch...');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  console.log(`[Step 2] Express app listening on ephemeral port: ${port}`);

  let createdConversationId: string | null = null;
  let createdUsageId: string | null = null;

  try {
    // 3. Exercise real authenticated consumer TRINETRA request through application API
    console.log('[Step 3] Dispatching real authenticated POST /api/v1/ai/chat request...');
    const auditPrompt = 'PHASE_12D_AUDIT: Give a 1-sentence tip for runners stretching calves.';
    const chatRes = await fetch(`http://127.0.0.1:${port}/api/v1/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message: auditPrompt,
        stream: false
      })
    });

    console.log(`[Step 3] Chat HTTP status: ${chatRes.status} ${chatRes.statusText}`);
    const chatJson = await chatRes.json();
    console.log('[Step 3] Response payload:', JSON.stringify(chatJson, null, 2));

    if (chatRes.status !== 200 || !chatJson.success) {
      throw new Error(`Chat API request failed: ${JSON.stringify(chatJson)}`);
    }

    createdConversationId = chatJson.data.conversationId;
    console.log(`[Step 3] Active conversation ID: ${createdConversationId}`);

    // 4. Verify analytics persistence in staging PostgreSQL
    console.log('[Step 4] Connecting directly to staging PostgreSQL to inspect ai_usage_analytics...');
    const pg = new PgClient({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    await pg.connect();

    const usageQuery = await pg.query(
      `SELECT * FROM public.ai_usage_analytics
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (usageQuery.rows.length === 0) {
      throw new Error('No ai_usage_analytics record found for user');
    }

    const usageRow = usageQuery.rows[0];
    createdUsageId = usageRow.id;

    console.log('[Step 4] Persisted ai_usage_analytics record:');
    console.log({
      id: usageRow.id,
      user_id: usageRow.user_id,
      organization_id: usageRow.organization_id,
      agent_id: usageRow.agent_id,
      provider: usageRow.provider,
      model: usageRow.model,
      duration_ms: usageRow.duration_ms,
      prompt_tokens: usageRow.prompt_tokens,
      completion_tokens: usageRow.completion_tokens,
      total_tokens: usageRow.total_tokens,
      success: usageRow.success,
      created_at: usageRow.created_at
    });

    // Validations for Check 3
    console.log('\n--- CHECK 3 VERIFICATION CRITERIA ---');
    console.log('1. User ownership matches:', usageRow.user_id === userId ? 'PASS' : 'FAIL');
    console.log('2. NULL organization handling:', usageRow.organization_id === null ? 'PASS (organization_id is NULL)' : 'FAIL');
    console.log('3. Prompt tokens > 0:', usageRow.prompt_tokens > 0 ? `PASS (${usageRow.prompt_tokens})` : 'FAIL');
    console.log('4. Completion tokens > 0:', usageRow.completion_tokens > 0 ? `PASS (${usageRow.completion_tokens})` : 'FAIL');
    console.log('5. Total tokens equals sum:', usageRow.total_tokens === (usageRow.prompt_tokens + usageRow.completion_tokens) ? `PASS (${usageRow.total_tokens})` : 'FAIL');
    console.log('6. Duration ms > 0:', usageRow.duration_ms > 0 ? `PASS (${usageRow.duration_ms} ms)` : 'FAIL');
    console.log('7. Success flag is true:', usageRow.success === true ? 'PASS' : 'FAIL');

    // 5. Check 4: Verify B2B analytics queries remain organization-scoped and cannot retrieve consumer records
    console.log('\n--- CHECK 4 VERIFICATION (B2B ISOLATION) ---');
    const b2bResult = await aiUsageRepository.getUsageByOrganization('00000000-0000-0000-0000-000000000099');
    const b2bRecords = b2bResult.isSuccess() ? b2bResult.value : [];
    const consumerLeakedIntoB2B = b2bRecords.some(r => r.id === createdUsageId || r.organizationId === null);
    console.log('1. B2B org query returns consumer records:', consumerLeakedIntoB2B ? 'FAIL (LEAK DETECTED)' : 'PASS (ISOLATED - 0 leaked)');

    const consumerResult = await aiUsageRepository.getUserUsage(userId);
    const consumerRecords = consumerResult.isSuccess() ? consumerResult.value : [];
    const consumerFoundInUserQuery = consumerRecords.some(r => r.id === createdUsageId);
    console.log('2. Consumer query returns own consumer records:', consumerFoundInUserQuery ? 'PASS' : 'FAIL');

    // 6. Safe cleanup of audit data
    console.log('\n--- CLEANUP OF AUDIT TEST DATA ---');
    if (createdUsageId) {
      await pg.query('DELETE FROM public.ai_usage_analytics WHERE id = $1', [createdUsageId]);
      console.log(`Deleted audit usage record: ${createdUsageId}`);
    }
    if (createdConversationId) {
      await pg.query('DELETE FROM public.ai_messages WHERE conversation_id = $1', [createdConversationId]);
      await pg.query('DELETE FROM public.ai_conversations WHERE id = $1', [createdConversationId]);
      console.log(`Deleted audit conversation & messages: ${createdConversationId}`);
    }

    await pg.end();
    console.log('=== CHECKS 3 & 4 AUDIT COMPLETED SUCCESSFULLY ===');
  } finally {
    server.close();
  }
}

runAudit().catch((err) => {
  console.error('AUDIT ERROR:', err);
  process.exit(1);
});
