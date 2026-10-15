const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });
const { createClient } = require('@supabase/supabase-js');

async function testLogin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const password = process.env.VITE_DEMO_PASSWORD || 'demo2026';

  console.log(`Testing auth sign-in for demo@sweatfix.com against ${supabaseUrl}...`);
  const client = createClient(supabaseUrl, anonKey);
  const { data, error } = await client.auth.signInWithPassword({
    email: 'demo@sweatfix.com',
    password: password
  });

  if (error) {
    console.error('Sign-in failed:', error.message);
    return;
  }

  console.log('Sign-in successful!');
  console.log('User ID:', data.user.id);
  console.log('Email:', data.user.email);
  console.log('Token prefix:', data.session.access_token.substring(0, 15) + '...');
  return data.session.access_token;
}

testLogin();
