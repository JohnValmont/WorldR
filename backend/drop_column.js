const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/worldr_db'
});

async function run() {
  try {
    await client.connect();
    await client.query("ALTER TABLE manufacturing_factories DROP COLUMN maintenance_budget_modifier;");
    console.log("Dropped column");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
