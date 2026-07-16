const { Client } = require('pg');
const c = new Client('postgresql://postgres:postgres@localhost:5432/worldr_db');
c.connect().then(() => c.query(`SELECT * FROM pol_cycles WHERE state_id = '3959caca-1bf7-4e84-8d37-7b55d0d809b3'`))
  .then(res => console.log(res.rows))
  .catch(console.error)
  .finally(() => c.end());
