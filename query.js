const { Client } = require('pg'); 
const client = new Client({ user: 'postgres', host: 'localhost', database: 'worldr', password: 'postgres', port: 5432 }); 
client.connect(); 
client.query("SELECT id, name, expansion_status, expansion_completion_year, expansion_completion_month FROM manufacturing_factories WHERE expansion_status = 'construction_underway'")
  .then(res => console.log(res.rows))
  .catch(console.error)
  .finally(() => client.end());
