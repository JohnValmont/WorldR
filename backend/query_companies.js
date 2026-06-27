const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL
});

async function run() {
  const companies = await db('companies').select('id', 'name', 'industry_id', 'subsector_id');
  console.log(companies);
  process.exit(0);
}
run().catch(console.error);
