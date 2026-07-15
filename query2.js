const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/worldr_db' }); 
client.connect(); 
client.query("SELECT id, name, expansion_status, expansion_completion_year, expansion_completion_month FROM manufacturing_factories WHERE expansion_status = 'construction_underway'")
  .then(res => console.log(res.rows))
  .catch(console.error)
  .finally(() => client.end());
