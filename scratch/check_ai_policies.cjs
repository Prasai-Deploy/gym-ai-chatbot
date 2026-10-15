const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkPolicies() {
  await c.connect();
  const res = await c.query(`
    SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as qual, pg_get_expr(polwithcheck, polrelid) as with_check
    FROM pg_policy
    WHERE polrelid IN ('public.ai_conversations'::regclass, 'public.ai_messages'::regclass, 'public.ai_usage_analytics'::regclass);
  `);
  console.log('Policies:');
  console.table(res.rows);
  await c.end();
}

checkPolicies();
