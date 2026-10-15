import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

import request from 'supertest';
import { app } from '../backend/src/app/app';
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

async function runLiveChatFlowTest() {
  console.log('=== STRIVA V2 CHATBOT & API END-TO-END VERIFICATION ===\n');

  // 1. Check Health Endpoints
  console.log('[1. Health Endpoints]');
  const healthRes = await request(app).get('/health');
  console.log('GET /health:', healthRes.status, healthRes.body);

  const readyRes = await request(app).get('/ready');
  console.log('GET /ready:', readyRes.status, readyRes.body);

  // 2. Real Auth Authentication
  console.log('\n[2. Real Supabase Authentication]');
  const supabaseUrl = process.env.SUPABASE_URL!;
  const anonKey = process.env.SUPABASE_ANON_KEY!;
  const password = process.env.VITE_DEMO_PASSWORD || 'demo2026';

  const supabaseClient = createClient(supabaseUrl, anonKey);
  const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
    email: 'demo@sweatfix.com',
    password: password
  });

  if (authError || !authData.session) {
    console.error('Auth login failed:', authError?.message);
    return;
  }

  const token = authData.session.access_token;
  const userId = authData.user.id;
  console.log(`Signed in successfully as ${authData.user.email} (UUID: ${userId})`);

  // 3. Unauthenticated Rejection Test
  console.log('\n[3. Unauthenticated & Invalid Request Testing]');
  const unauthRes = await request(app)
    .post('/api/v1/ai/chat')
    .send({ message: 'Hello' });
  console.log('POST /api/v1/ai/chat without token:', unauthRes.status, unauthRes.body);

  const badBodyRes = await request(app)
    .post('/api/v1/ai/chat')
    .set('Authorization', `Bearer ${token}`)
    .send({});
  console.log('POST /api/v1/ai/chat with empty body:', badBodyRes.status, badBodyRes.body);

  // 4. Conversation List
  console.log('\n[4. List Existing Conversations]');
  const listRes = await request(app)
    .get('/api/v1/ai/conversations')
    .set('Authorization', `Bearer ${token}`);
  console.log('GET /api/v1/ai/conversations status:', listRes.status);
  console.log('Found conversations count:', listRes.body?.data?.length ?? 0);

  // 5. Live Model Chat Request (JSON)
  console.log('\n[5. Real AI Model Chat Completion Test (JSON)]');
  const chatStart = Date.now();
  const chatRes = await request(app)
    .post('/api/v1/ai/chat')
    .set('Authorization', `Bearer ${token}`)
    .send({
      message: 'Hello TRINETRA, give me one quick tip for lower back recovery in one sentence.'
    });

  const chatDuration = Date.now() - chatStart;
  console.log('POST /api/v1/ai/chat status:', chatRes.status);
  console.log('Response body:', JSON.stringify(chatRes.body, null, 2));
  console.log(`Duration: ${chatDuration}ms`);

  const createdConvId = chatRes.body?.data?.conversationId;

  // 6. Verify Database Persistence in PostgreSQL Directly
  console.log('\n[6. Direct PostgreSQL Persistence Verification]');
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await pgClient.connect();

  if (createdConvId) {
    const convRow = await pgClient.query('SELECT * FROM ai_conversations WHERE id = $1', [createdConvId]);
    console.log(`ai_conversations row found for ID ${createdConvId}:`, convRow.rows.length === 1);
    if (convRow.rows.length > 0) {
      console.log('Conversation record:', convRow.rows[0]);
    }

    const messagesRows = await pgClient.query(
      'SELECT id, role, content, created_at FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [createdConvId]
    );
    console.log(`ai_messages rows count: ${messagesRows.rows.length}`);
    messagesRows.rows.forEach((m, idx) => {
      console.log(`  Msg ${idx + 1} [${m.role}]: ${m.content?.substring(0, 80)}...`);
    });
  }

  // Check ai_usage_analytics for recent logs
  const usageRows = await pgClient.query(
    'SELECT id, agent_id, model, provider, prompt_tokens, completion_tokens, total_tokens, success, error_category, created_at FROM ai_usage_analytics WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3',
    [userId]
  );
  console.log(`ai_usage_analytics rows count for user: ${usageRows.rows.length}`);
  usageRows.rows.forEach(u => console.log('  Usage record:', u));

  await pgClient.end();

  // 7. Live SSE Streaming Request Test
  console.log('\n[7. Real AI Model Streaming Test (SSE)]');
  const streamRes = await request(app)
    .post('/api/v1/ai/chat')
    .set('Authorization', `Bearer ${token}`)
    .set('Accept', 'text/event-stream')
    .send({
      message: 'What is a good stretch for tight hamstrings? Keep it brief.',
      conversationId: createdConvId,
      stream: true
    });

  console.log('SSE Stream status:', streamRes.status);
  console.log('SSE Headers:', streamRes.headers['content-type']);
  console.log('SSE Body preview (first 400 chars):');
  console.log(streamRes.text.substring(0, 400));
}

runLiveChatFlowTest().catch(console.error);
