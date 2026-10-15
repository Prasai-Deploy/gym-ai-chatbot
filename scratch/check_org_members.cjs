const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkMembers() {
  await c.connect();
  const res = await c.query('SELECT * FROM organization_members;');
  console.log('All organization_members:', res.rows);
  await c.end();
}

checkMembers();
