const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });

async function setup() {
  try {
    // 1. Lock (deactivate) the 4 states
    await pool.query(`UPDATE pol_states SET is_active = false WHERE code IN ('ironvale', 'drennport', 'westport', 'greenmere')`);
    console.log("Locked 4 states.");

    // 2. Check if National Parliament exists
    const np = await pool.query(`SELECT id FROM pol_states WHERE code = 'national'`);
    let npId;
    if (np.rows.length === 0) {
      console.log("National Parliament does not exist. Creating it...");
      // Generate UUID
      const uuidReq = await pool.query(`SELECT gen_random_uuid() as id`);
      npId = uuidReq.rows[0].id;
      await pool.query(`
        INSERT INTO pol_states (id, code, name, is_active, country_id, population, registered_voters, base_turnout)
        VALUES ($1, 'national', 'National Parliament', true, 'drennia', 10000000, 7000000, 0.60)
      `, [npId]);
      console.log("Created National Parliament with ID", npId);
    } else {
      npId = np.rows[0].id;
      // Reactivate if not active
      await pool.query(`UPDATE pol_states SET is_active = true WHERE id = $1`, [npId]);
      console.log("National Parliament already exists, ensured it is active.");
    }
    
    // 3. Ensure a cycle exists for it
    const cycle = await pool.query(`SELECT id FROM pol_cycles WHERE state_id = $1 AND status = 'open'`, [npId]);
    if (cycle.rows.length === 0) {
       const uuidReq = await pool.query(`SELECT gen_random_uuid() as id`);
       const cycleId = uuidReq.rows[0].id;
       // get current clock
       const clock = await pool.query(`SELECT pol_current_year, pol_current_month FROM world_clock LIMIT 1`);
       const cY = clock.rows[0].pol_current_year;
       const cM = clock.rows[0].pol_current_month;
       const curArc = cY * 12 + (cM - 1);
       
       // National parliament polling arc logic
       await pool.query(`
         INSERT INTO pol_cycles (id, state_id, cycle_number, phase, start_arc, polling_arc, formation_end_arc, status)
         VALUES ($1, $2, 1, 'governing', 1, $3, $4, 'open')
       `, [cycleId, npId, curArc + 2, curArc + 3]); // set it to poll soon!
       console.log("Created open cycle for National Parliament.");
    }

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
setup();
