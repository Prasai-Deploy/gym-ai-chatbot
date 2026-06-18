import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

async function setup() {
  console.log("Fixing database state using Service Role key...");
  
  // 1. Add demo email to allowed_users
  const { data: d1, error: e1 } = await supabase.from('allowed_users')
    .upsert([{ email: 'demo@sweatfix.com' }], { onConflict: 'email' })
    .select();
  
  if (e1) console.error("Error inserting into allowed_users:", e1.message);
  else console.log("Added to allowed_users:", d1);

  // 2. Add demo user to users table as an admin
  const { data: d2, error: e2 } = await supabase.from('users')
    .insert([{
      email: 'demo@sweatfix.com',
      name: 'Demo User',
      is_admin: true,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo'
    }])
    .select();
  
  if (e2 && e2.code !== '23505') console.error("Error inserting into users:", e2.message);
  else if (e2?.code === '23505') console.log("Demo user already exists in users table.");
  else console.log("Added to users:", d2);
  
  // 3. Make sure existing demo user is admin (if it existed)
  const { data: d3, error: e3 } = await supabase.from('users')
    .update({ is_admin: true })
    .eq('email', 'demo@sweatfix.com')
    .select();
    
  if (e3) console.error("Error updating users:", e3.message);
  else console.log("Made demo user admin:", d3);
}

setup();
