const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/worldr_db' });
client.connect()
  .then(() => client.query("ALTER TABLE manufacturing_vehicle_models ALTER COLUMN applied_engineering_package TYPE TEXT;"))
  .then(() => { console.log('Migration successful'); client.end(); })
  .catch(console.error);
