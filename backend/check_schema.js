const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/worldr_test' });
client.connect().then(() => client.query(\SELECT column_name FROM information_schema.columns WHERE table_name = 'manufacturing_market_brand_arc_results'\).then(res => { console.log(res.rows); client.end(); }));
