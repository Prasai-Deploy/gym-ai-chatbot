const { Client } = require('pg');

async function checkLocalDb() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/striva_restore_test'
  });

  try {
    await client.connect();
    console.log('Connected to local disposable PG on 5433.');

    const migRes = await client.query('SELECT count(*) FROM _migrations');
    console.log('Current migration count:', migRes.rows[0].count);

    const latestMigs = await client.query('SELECT name, run_at FROM _migrations ORDER BY run_at DESC LIMIT 5');
    console.log('Latest migrations:');
    latestMigs.rows.forEach(r => console.log(` - ${r.name} (${r.run_at})`));

    const colRes = await client.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'ai_usage_analytics' 
        AND column_name = 'organization_id'
    `);
    console.log('organization_id in ai_usage_analytics:', colRes.rows[0]);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkLocalDb();
