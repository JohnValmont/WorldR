import * as dotenv from 'dotenv';
import { Client } from 'pg';
dotenv.config({ path: '.env' });

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  try {
    await c.query('BEGIN');

    // 1. Rename Westmark to Westport
    await c.query(`
      UPDATE drennia_states 
      SET name = 'Westport', code = 'WESTPORT' 
      WHERE code = 'WESTMARK' OR name = 'Westmark'
    `);
    console.log('Renamed Westmark -> Westport');

    // Fetch all states to get their IDs
    const { rows: states } = await c.query('SELECT id, code FROM drennia_states');
    const stateMap: Record<string, string> = {};
    for (const s of states) {
      stateMap[s.code] = s.id;
    }

    // 2. Update district assignments
    // Drennport: 1-52 (52)
    // Ironvale: 53-82 (30)
    // Greenmere: 83-109 (27)
    // Westport: 110-151 (42)
    
    await c.query(`UPDATE drennia_districts SET state_id = $1 WHERE district_number BETWEEN 1 AND 52`, [stateMap['DRENNPORT']]);
    await c.query(`UPDATE drennia_districts SET state_id = $1 WHERE district_number BETWEEN 53 AND 82`, [stateMap['IRONVALE']]);
    await c.query(`UPDATE drennia_districts SET state_id = $1 WHERE district_number BETWEEN 83 AND 109`, [stateMap['GREENMERE']]);
    await c.query(`UPDATE drennia_districts SET state_id = $1 WHERE district_number BETWEEN 110 AND 151`, [stateMap['WESTPORT']]);

    console.log('Updated district state assignments');

    await c.query('COMMIT');
    console.log('Done.');
  } catch (e: any) {
    await c.query('ROLLBACK');
    console.error('Error:', e.message);
  } finally {
    await c.end();
  }
}

main();
