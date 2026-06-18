import supabase from '../db.js';

async function checkAnonRead() {
  console.log("Checking anon read on allowed_users...");
  const { data, error } = await supabase.from('allowed_users').select('*');
  console.log("Data:", data, "Error:", error);
}

checkAnonRead();
