import supabase from '../db.js';

async function checkDemo() {
  console.log("Checking demo user in allowed_users...");
  const { data: allowed, error: err1 } = await supabase.from('allowed_users').select('*');
  console.log("allowed_users table contents:", allowed, "Error:", err1);

  console.log("Checking demo user in users table...");
  const { data: user, error: err2 } = await supabase.from('users').select('id, email, is_admin').eq('email', 'demo@sweatfix.com');
  console.log("users table demo user:", user, "Error:", err2);
}

checkDemo();
