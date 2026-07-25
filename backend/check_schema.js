const { Client } = require('pg');

async function check() {
  const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/worldr_db' });
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'manufacturing_market_allocations';
  `);
  console.log(res.rows);
  await client.end();
}

check();
