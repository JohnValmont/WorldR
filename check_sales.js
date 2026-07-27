const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/worldr_db' });
pool.query("SELECT * FROM companies WHERE name ILIKE '%Aldrich Automobiles%' LIMIT 5;")
  .then(res => { console.table(res.rows); pool.end(); })
  .catch(err => { console.error(err); pool.end(); });
