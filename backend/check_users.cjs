const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/worldr_db' });
client.connect().then(() => client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'")).then(res => { console.table(res.rows); client.end(); }).catch(console.error);
