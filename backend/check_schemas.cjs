const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/worldr_db' });
client.connect().then(() => client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name LIKE '%manufacturing%'")).then(res => { console.table(res.rows); client.end(); }).catch(console.error);
