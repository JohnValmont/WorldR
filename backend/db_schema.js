require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
    return client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'manufacturing_production_lines'");
}).then(res => {
    console.log(res.rows);
    return client.end();
}).catch(console.error);
