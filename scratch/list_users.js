import supabase from '../db.js';

async function listUsers() {
  const { data, error } = await supabase.from('users').select('id, email, name');
  if (error) {
    console.error("Error fetching users:", error);
    return;
  }
  console.log("Found users:");
  console.log(data);
}

listUsers();
