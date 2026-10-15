const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

client.connect().then(async () => {
  const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_tool_executions'");
  console.log('Columns of ai_tool_executions on staging:', cols.rows);
  const fks = await client.query("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'ai_tool_executions'::regclass");
  console.log('Constraints on ai_tool_executions on staging:', fks.rows);
  await client.end();
}).catch(console.error);
