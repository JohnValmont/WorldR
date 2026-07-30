const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });

async function check() {
  try {
    const cRes = await pool.query("SELECT * FROM companies WHERE name ILIKE '%Arcas%'");
    if (cRes.rows.length === 0) {
      console.log('Arcas not found in live DB');
      return;
    }
    const c = cRes.rows[0];
    
    const models = await pool.query(`
      SELECT m.name as model_name, m.sale_price, m.manufacturing_cost_per_unit, m.status, 
             m.launched_year, m.launched_month,
             c.name as company_name, c.is_npc
      FROM manufacturing_vehicle_models m 
      JOIN companies c ON m.company_id = c.id
      WHERE m.company_id = $1 AND m.status = 'active'
    `, [c.id]);
    
    const compFinances = await pool.query(`
      SELECT available_cash 
      FROM company_finances 
      WHERE company_id = $1
    `, [c.id]);
    
    const charFinances = await pool.query(`
      SELECT c.name, cf.cash_in_hand 
      FROM character_finances cf
      JOIN characters c ON cf.character_id = c.id
      WHERE c.id = $1
    `, [c.owner_character_id]);
    
    const world = await pool.query("SELECT current_year, current_month FROM world_clock LIMIT 1");
    
    const cy = world.rows[0].current_year;
    const cm = world.rows[0].current_month;
    
    console.log('--- WORLD TIME ---');
    console.log(`Year ${cy}, Month ${cm}`);
    
    console.log('\n--- ARCAS ENGINEERING ---');
    console.log(`Company ID: ${c.id}`);
    console.log(`Owner: ${charFinances.rows[0]?.name}`);
    console.log(`Company Cash: $${Number(compFinances.rows[0]?.available_cash || 0).toLocaleString()}`);
    console.log(`Character Cash: $${Number(charFinances.rows[0]?.cash_in_hand || 0).toLocaleString()}`);
    
    console.log('\n--- ACTIVE MODELS ---');
    models.rows.forEach(m => {
      const completionMonths = (m.launched_year * 12 + m.launched_month);
      const currentMonths = (cy * 12 + cm);
      const monthsInMarket = completionMonths ? (currentMonths - completionMonths) : 0;
      
      console.log(`Model: ${m.model_name}`);
      console.log(`  Cost: $${Number(m.manufacturing_cost_per_unit).toLocaleString()}`);
      console.log(`  Sell Price: $${Number(m.sale_price).toLocaleString()}`);
      console.log(`  Time in Market: ${monthsInMarket} months`);
      console.log('  -------------------------');
    });

  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
