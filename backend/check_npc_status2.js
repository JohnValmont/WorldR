const { Client } = require('pg');
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";

async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("--- COMPANIES ---");
  const cos = await client.query(`
    SELECT c.id, c.name, cf.available_cash, cf.debt, c.status
    FROM companies c
    JOIN company_finances cf ON c.id = cf.company_id
    WHERE c.name ILIKE '%Verdian%' OR c.name ILIKE '%HaulPro%' OR c.name ILIKE '%Arcas%' OR c.name ILIKE '%Aldrich%' OR c.name ILIKE '%Valmont%'
  `);
  console.table(cos.rows);

  const ids = cos.rows.map(r => `'${r.id}'`).join(',');

  console.log("\n--- MODELS ---");
  const models = await client.query(`
    SELECT m.id, c.name as company, m.name, m.sale_price, m.manufacturing_cost_per_unit, m.appeal_score, m.vehicle_class, m.target_segment
    FROM manufacturing_vehicle_models m
    JOIN companies c ON m.company_id = c.id
    WHERE c.id IN (${ids})
  `);
  console.table(models.rows);

  console.log("\n--- PRODUCTION ---");
  const prod = await client.query(`
    SELECT c.name as company, p.status, SUM(p.target_units_per_month) as target_units
    FROM manufacturing_production_lines p
    JOIN companies c ON p.company_id = c.id
    WHERE c.id IN (${ids})
    GROUP BY c.name, p.status
  `);
  console.table(prod.rows);

  console.log("\n--- ALLOCATIONS in Drennia ---");
  const alloc = await client.query(`
    SELECT c.name as company, m.name as model, a.units_allocated, a.marketing_tier
    FROM manufacturing_market_allocations a
    JOIN manufacturing_vehicle_models m ON a.vehicle_model_id = m.id
    JOIN companies c ON a.company_id = c.id
    WHERE c.id IN (${ids})
  `);
  console.table(alloc.rows);

  console.log("\n--- SALES (Last Month) ---");
  const sales = await client.query(`
    SELECT c.name as company, m.name as model, s.units_sold, s.revenue, s.main_reason_code
    FROM manufacturing_sales_results s
    JOIN manufacturing_vehicle_models m ON s.vehicle_model_id = m.id
    JOIN companies c ON m.company_id = c.id
    WHERE c.id IN (${ids}) AND s.world_year = 7 AND s.world_month = 4
  `);
  console.table(sales.rows);

  await client.end();
}
run().catch(console.error);
