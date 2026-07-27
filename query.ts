require('dotenv').config({ path: './backend/.env' });
import * as crypto from 'crypto';
const db = require('./backend/src/config/database').default;

async function run() {
  try {
    const allCompanies = await db('companies').select('*');
    console.log("All companies:");
    allCompanies.forEach(c => console.log(c.id, c.name, c.is_npc));
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
