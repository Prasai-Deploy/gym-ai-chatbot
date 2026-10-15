const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/striva_restore_test' });

client.connect().then(async () => {
  const res = await client.query(`
    SELECT tc.constraint_name, ccu.table_schema, ccu.table_name, ccu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_name = 'ai_tool_executions_user_id_fkey';
  `);
  console.log(res.rows);
  await client.end();
}).catch(console.error);
