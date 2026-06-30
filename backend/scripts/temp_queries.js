require('ts-node/register');
const { db } = require('../src/config/database');

async function run() {
  try {
    const q1 = await db.raw(`
SELECT c.name AS npc, m.target_segment, m.sale_price,
       m.manufacturing_cost_per_unit AS cost,
       m.reliability_score, m.performance_score, m.fuel_efficiency_score,
       m.appeal_score, m.cargo_score, m.safety_score
FROM manufacturing_vehicle_models m
JOIN companies c ON c.id = m.company_id
WHERE c.is_npc = TRUE ORDER BY c.name;
    `);
    console.table(q1.rows);

    const q2 = await db.raw(`
SELECT c.name, f.available_cash, a.units_allocated, a.marketing_tier
FROM companies c
JOIN company_finances f ON f.company_id = c.id
LEFT JOIN manufacturing_market_allocations a ON a.company_id = c.id
WHERE c.is_npc = TRUE ORDER BY c.name;
    `);
    console.table(q2.rows);
  } catch (e) {
    console.error(e);
  } finally {
    db.destroy();
  }
}
run();
