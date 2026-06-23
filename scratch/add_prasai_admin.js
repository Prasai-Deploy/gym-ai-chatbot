import supabase from '../db.js';

async function addAdmin() {
  const email = 'prasai3131@gmail.com';
  console.log(`Setting up user ${email} as admin...`);

  // 1. Ensure the user exists in allowed_users
  const { data: allowedData, error: whitelistErr } = await supabase.from('allowed_users')
    .upsert({ email }, { onConflict: 'email' })
    .select();
  if (whitelistErr) {
    console.error("Error adding to whitelist:", whitelistErr.message);
  } else {
    console.log("Whitelisted successfully:", allowedData);
  }

  // 2. Ensure the user exists in admins table with super_admin role
  const { data: adminData, error: adminErr } = await supabase.from('admins')
    .upsert({ email, name: 'Prasai Admin', role: 'super_admin' }, { onConflict: 'email' })
    .select();
  if (adminErr) {
    console.error("Error adding to admins table:", adminErr.message);
  } else {
    console.log("Admin table entry added/updated successfully:", adminData);
  }

  // 3. Ensure if the user exists in the users table, they have is_admin = true
  const { data: existingUser, error: checkErr } = await supabase.from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (checkErr) {
    console.error("Error checking users table:", checkErr.message);
  } else if (existingUser) {
    const { data: updatedUser, error: updateErr } = await supabase.from('users')
      .update({ is_admin: true })
      .eq('id', existingUser.id)
      .select();
    if (updateErr) {
      console.error("Error updating user admin status:", updateErr.message);
    } else {
      console.log("Existing user updated to admin:", updatedUser);
    }
  } else {
    console.log("User record does not exist in the users table yet. It will be created as admin when they first log in via Google.");
  }
}

addAdmin();
