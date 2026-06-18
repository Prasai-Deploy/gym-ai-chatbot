import supabase from '../db.js';

async function makeDemoAdmin() {
  console.log("Setting up demo user as admin...");
  const email = 'demo@sweatfix.com';
  
  // 1. Ensure the user exists in allowed_users
  const { error: whitelistErr } = await supabase.from('allowed_users')
    .upsert({ email }, { onConflict: 'email' });
  if (whitelistErr) console.error("Error adding to whitelist:", whitelistErr.message);

  // 2. Ensure user exists in users table and is_admin is true
  const { data: existingUser, error: checkErr } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
  
  if (existingUser) {
    const { error: updateErr } = await supabase.from('users').update({ is_admin: true }).eq('id', existingUser.id);
    if (updateErr) console.error("Error updating user:", updateErr.message);
    else console.log("Demo user updated to admin!");
  } else {
    const { error: insertErr } = await supabase.from('users').insert({
      email,
      name: "Demo User",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Demo",
      is_admin: true,
      water_goal: 2000,
    });
    if (insertErr) console.error("Error creating user:", insertErr.message);
    else console.log("Demo user created and set to admin!");
  }
}

makeDemoAdmin();
