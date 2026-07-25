const { Client } = require('pg');

async function check() {
  const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/worldr_db' });
  await client.connect();
  const res = await client.query('SELECT world_year, world_month, COUNT(*) as count FROM manufacturing_sales_results GROUP BY world_year, world_month ORDER BY world_year, world_month');
  console.log(res.rows);
  await client.end();
}

check();
