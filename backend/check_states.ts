import * as dotenv from 'dotenv';
import { Client } from 'pg';
dotenv.config({ path: '.env' });

const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(async () => {
  await c.query(`UPDATE drennia_states SET name = 'Drennport', code = 'DRENNPORT' WHERE id = '11111111-0000-0000-0000-000000000001'`);
  await c.query(`UPDATE drennia_states SET name = 'Ironvale',  code = 'IRONVALE'  WHERE id = '11111111-0000-0000-0000-000000000002'`);
  await c.query(`UPDATE drennia_states SET name = 'Greenmere', code = 'GREENMERE' WHERE id = '11111111-0000-0000-0000-000000000003'`);
  await c.query(`UPDATE drennia_states SET name = 'Westmark',  code = 'WESTMARK'  WHERE id = '11111111-0000-0000-0000-000000000004'`);
  const { rows } = await c.query('SELECT id, name, code FROM drennia_states ORDER BY name');
  rows.forEach((x: any) => console.log(`✓ ${x.code} — ${x.name}`));
  c.end();
}).catch((e: any) => { console.error(e.message); c.end(); });
