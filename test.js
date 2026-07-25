require('dotenv').config({ path: './backend/.env' });
const { db } = require('./backend/src/config/database');
async function run() {
  const companies = await db('companies').select('id', 'name');
  console.log(companies.map(c => c.name));
  process.exit(0);
}
run();
