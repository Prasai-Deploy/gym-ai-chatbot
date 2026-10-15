const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function inspectUsageDetails() {
  await c.connect();
  console.log('--- Constraints on ai_usage_analytics ---');
  const constraints = await c.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'public.ai_usage_analytics'::regclass;
  `);
  console.table(constraints.rows);

  console.log('--- Indexes on ai_usage_analytics ---');
  const indexes = await c.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'ai_usage_analytics';
  `);
  console.table(indexes.rows);

  console.log('--- RLS Policies on ai_usage_analytics ---');
  const policies = await c.query(`
    SELECT polname, polcmd, polroles, pg_get_expr(polqual, polrelid) as qual, pg_get_expr(polwithcheck, polrelid) as with_check
    FROM pg_policy
    WHERE polrelid = 'public.ai_usage_analytics'::regclass;
  `);
  console.table(policies.rows);

  await c.end();
}

inspectUsageDetails().catch(console.error);
