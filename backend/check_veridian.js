const { Client } = require('pg');
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";

async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const comp = await client.query(`SELECT id FROM companies WHERE name = 'Veridian Motors'`);
  const cId = comp.rows[0]?.id;
  if(!cId) {
    console.log("No Veridian Motors found!");
    return client.end();
  }

  const sales = await client.query(`
    SELECT m.name as model, SUM(s.units_sold) as total_sold
    FROM manufacturing_sales_results s
    JOIN manufacturing_vehicle_models m ON s.vehicle_model_id = m.id
    WHERE s.company_id = $1 AND s.world_year = 7 AND s.world_month = 4
    GROUP BY m.name
  `, [cId]);
  console.log('\n--- VERIDIAN SALES ---');
  console.table(sales.rows);

  const models = await client.query(`
    SELECT m.name as model, m.sale_price, m.manufacturing_cost_per_unit, m.appeal_score, i.units_in_stock
    FROM manufacturing_vehicle_models m
    LEFT JOIN manufacturing_inventory i ON i.vehicle_model_id = m.id
    WHERE m.company_id = $1
  `, [cId]);
  console.log('\\n--- VERIDIAN MODELS ---');
  console.table(models.rows);

  const allocs = await client.query(`
    SELECT m.name as model, a.region_market_id, a.units_allocated
    FROM manufacturing_market_allocations a
    JOIN manufacturing_vehicle_models m ON a.vehicle_model_id = m.id
    WHERE a.company_id = $1
  `, [cId]);
  console.log('\n--- VERIDIAN ALLOCATIONS ---');
  console.table(allocs.rows);

  client.end();
}
run().catch(console.error);
