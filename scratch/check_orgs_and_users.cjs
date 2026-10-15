const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkOrgs() {
  await c.connect();
  const orgs = await c.query('SELECT id, name, slug FROM organizations LIMIT 10;');
  console.log('Organizations:', orgs.rows);

  const users = await c.query(`
    SELECT u.id, u.email, om.organization_id, om.role
    FROM auth.users u
    LEFT JOIN organization_members om ON om.user_id = u.id
    LIMIT 10;
  `);
  console.log('Users & Org Memberships:', users.rows);
  await c.end();
}

checkOrgs();
