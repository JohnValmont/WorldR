const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });

async function setup() {
  try {
    // Delete ironvale NPCs
    await pool.query(`DELETE FROM pol_parties WHERE state_id IN (SELECT id FROM pol_states WHERE code = 'ironvale') AND is_npc = TRUE`);
    console.log("Deleted old Ironvale NPCs.");

    // Ensure we have National Parliament NPCs
    const np = await pool.query(`SELECT id FROM pol_states WHERE code = 'national'`);
    if (np.rows.length > 0) {
      const npId = np.rows[0].id;
      const npcs = await pool.query(`SELECT id FROM pol_parties WHERE state_id = $1 AND is_npc = TRUE`, [npId]);
      if (npcs.rows.length === 0) {
         console.log("Creating National Parliament NPCs...");
         await pool.query(`
            INSERT INTO pol_parties (state_id, name, platform, treasury, is_npc, created_arc)
            VALUES 
            ($1, 'National Labour Front', '{"taxation": 30, "labour": 90, "investment": 70, "trade": 50, "stability": 50}'::jsonb, 500000.0000, TRUE, 0),
            ($1, 'National Progress Party', '{"taxation": 85, "labour": 35, "investment": 75, "trade": 80, "stability": 60}'::jsonb, 500000.0000, TRUE, 0),
            ($1, 'Civic Stability Union', '{"taxation": 55, "labour": 55, "investment": 60, "trade": 60, "stability": 80}'::jsonb, 500000.0000, TRUE, 0),
            ($1, 'Independent', '{"taxation": 50, "labour": 50, "investment": 50, "trade": 50, "stability": 50}'::jsonb, 50000.0000, TRUE, 0)
         `, [npId]);
         console.log("NPCs created.");
      } else {
        console.log("National Parliament NPCs already exist.");
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
setup();
