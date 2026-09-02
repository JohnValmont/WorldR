import * as dotenv from 'dotenv';
import { Client } from 'pg';
dotenv.config({ path: '.env' });
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect()
  .then(() => c.query('SELECT name, code FROM drennia_states'))
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); c.end(); })
  .catch(e => { console.error(e.message); c.end(); });
