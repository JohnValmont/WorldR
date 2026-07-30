const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/worldr_db' });

async function check() {
  try {
    const models = await pool.query(`
      SELECT m.name as model_name, m.sale_price, m.manufacturing_cost_per_unit, m.status, 
             m.launched_year, m.launched_month,
             c.name as company_name, c.is_npc
      FROM manufacturing_vehicle_models m 
      JOIN companies c ON m.company_id = c.id
      WHERE m.status = 'active'
    `);
    
    const compFinances = await pool.query(`
      SELECT c.name, cf.available_cash 
      FROM company_finances cf
      JOIN companies c ON cf.company_id = c.id
    `);
    
    const charFinances = await pool.query(`
      SELECT c.name, cf.cash_in_hand 
      FROM character_finances cf
      JOIN characters c ON cf.character_id = c.id
    `);
    
    const world = await pool.query("SELECT current_year, current_month FROM world_clock LIMIT 1");
    
    const cy = world.rows[0].current_year;
    const cm = world.rows[0].current_month;
    
    console.log('--- WORLD TIME ---');
    console.log(`Year ${cy}, Month ${cm}`);
    
    console.log('\n--- ACTIVE MODELS ---');
    models.rows.forEach(m => {
      const completionMonths = (m.launched_year * 12 + m.launched_month);
      const currentMonths = (cy * 12 + cm);
      const monthsInMarket = completionMonths ? (currentMonths - completionMonths) : 0;
      
      console.log(`Model: ${m.model_name} (by ${m.company_name})`);
      console.log(`  Cost: $${Number(m.manufacturing_cost_per_unit).toLocaleString()}`);
      console.log(`  Sell Price: $${Number(m.sale_price).toLocaleString()}`);
      console.log(`  Time in Market: ${monthsInMarket} months`);
      console.log('  -------------------------');
    });

    console.log('\n--- COMPANY FINANCES ---');
    compFinances.rows.forEach(c => console.log(`${c.name}: $${Number(c.available_cash).toLocaleString()}`));

    console.log('\n--- CHARACTER CASH ---');
    charFinances.rows.forEach(c => console.log(`${c.name}: $${Number(c.cash_in_hand).toLocaleString()}`));

  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
