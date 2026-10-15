const { Client } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query('SELECT * FROM organization_members WHERE user_id = $1', ['a1bf8b11-e2c7-4f7f-9d36-5af53418e20b']);
  console.log('Org members for demo user:', res.rows.length);
  const res2 = await client.query('SELECT * FROM organization_staff WHERE user_id = $1', ['a1bf8b11-e2c7-4f7f-9d36-5af53418e20b']);
  console.log('Org staff for demo user:', res2.rows.length);
  await client.end();
}
check().catch(console.error);
