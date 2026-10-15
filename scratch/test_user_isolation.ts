import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

import request from 'supertest';
import { app } from '../backend/src/app/app';
import { createClient } from '@supabase/supabase-js';

async function testIsolation() {
  console.log('=== TESTING USER ISOLATION ON AI CONVERSATION APIS ===\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const anonKey = process.env.SUPABASE_ANON_KEY!;

  const client = createClient(supabaseUrl, anonKey);

  // Sign in as User A (demo@sweatfix.com)
  const userARes = await client.auth.signInWithPassword({
    email: 'demo@sweatfix.com',
    password: process.env.VITE_DEMO_PASSWORD || 'demo2026'
  });
  const tokenA = userARes.data.session!.access_token;
  const userAId = userARes.data.user!.id;
  console.log(`User A (demo@sweatfix.com): ${userAId}`);

  // Create a conversation for User A
  const convRes = await request(app)
    .post('/api/v1/ai/chat')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ message: 'User A private health secret: recovery from shoulder injury.' });

  const convId = convRes.body?.data?.conversationId;
  console.log(`Created Conversation ID for User A: ${convId}`);

  // Now create/sign in as User B
  // Let's see if qa_verifier@sweatfix.com can log in or create a temporary user
  let tokenB: string | null = null;
  const userBRes = await client.auth.signInWithPassword({
    email: 'qa_verifier@sweatfix.com',
    password: process.env.VITE_DEMO_PASSWORD || 'demo2026'
  }).catch(() => null);

  if (userBRes?.data?.session) {
    tokenB = userBRes.data.session.access_token;
    console.log(`User B (qa_verifier@sweatfix.com): ${userBRes.data.user.id}`);
  } else {
    // Try sign up a random test user or use admin client to generate user
    const { supabaseAdmin } = await import('../backend/src/database/supabase');
    const tempEmail = `isolation_test_${Date.now()}@striva.test`;
    const created = await supabaseAdmin.auth.admin.createUser({
      email: tempEmail,
      password: 'TestPassword123!',
      email_confirm: true
    });
    const tempLogin = await client.auth.signInWithPassword({
      email: tempEmail,
      password: 'TestPassword123!'
    });
    tokenB = tempLogin.data.session!.access_token;
    console.log(`User B (temp user ${tempEmail}): ${tempLogin.data.user!.id}`);
  }

  // TEST 1: User B calls GET /api/v1/ai/conversations/:id/messages for User A's convId
  console.log('\n[Test 1] User B attempting GET /api/v1/ai/conversations/:id/messages for User A conversation:');
  const leakRes = await request(app)
    .get(`/api/v1/ai/conversations/${convId}/messages`)
    .set('Authorization', `Bearer ${tokenB}`);

  console.log('Status code:', leakRes.status);
  console.log('Response body:', leakRes.body);

  if (leakRes.status === 200 && leakRes.body?.data?.length > 0) {
    console.error('CRITICAL VULNERABILITY: User B was able to read User A messages!');
  } else {
    console.log('SUCCESS: User B was blocked from reading User A conversation.');
  }

  // TEST 2: User B calls POST /api/v1/ai/chat with conversationId belonging to User A
  console.log('\n[Test 2] User B attempting POST /api/v1/ai/chat injecting into User A conversation:');
  const injectRes = await request(app)
    .post('/api/v1/ai/chat')
    .set('Authorization', `Bearer ${tokenB}`)
    .send({
      message: 'Malicious injection into User A conversation by User B',
      conversationId: convId
    });

  console.log('Status code:', injectRes.status);
  console.log('Response body:', injectRes.body);
}

testIsolation().catch(console.error);
