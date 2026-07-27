const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?connection_limit=1";

async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // The 4 companies that had bad rows
  const badCompanyIds = [
    "dd9528ea-3387-49f2-9660-3589e152ab8c",
    "b215c146-07df-432c-84df-6824f4fcc1b9",
    "ca779e6d-94a4-436b-b158-49de24c6228b",
    "88db3738-d8d6-4fb4-8859-f607a48bbe52"
  ];

  const res = await client.query(`SELECT id, name, is_npc, created_at FROM companies WHERE id = ANY($1)`, [badCompanyIds]);
  console.log("Companies with bad data:", JSON.stringify(res.rows, null, 2));

  // Also: check if there's a separate injectClones-style table that maps arc to month 
  const firstSale = await client.query(`
    SELECT r.world_year, r.world_month, r.created_at, c.name as company, m.name as model
    FROM manufacturing_sales_results r 
    JOIN companies c ON c.id = r.company_id
    JOIN manufacturing_vehicle_models m ON m.id = r.vehicle_model_id
    WHERE r.world_year <= 6
    ORDER BY r.created_at ASC
    LIMIT 5
  `);
  console.log("Earliest correct sales:", JSON.stringify(firstSale.rows, null, 2));

  await client.end();
}
run().catch(console.error);
