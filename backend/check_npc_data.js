const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Check the NPC companies
  const npcs = await client.query("SELECT id, name, npc_personality, created_at_world_year, country_id FROM companies WHERE is_npc = true ORDER BY created_at_world_year DESC");
  console.log("=== NPC COMPANIES ===");
  npcs.rows.forEach(r => console.log(`  ID:${r.id} | ${r.name} | personality:${r.npc_personality} | created_year:${r.created_at_world_year} | country:${r.country_id}`));

  // Check world_instances columns
  const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'world_instances' ORDER BY ordinal_position");
  console.log("\n=== world_instances COLUMNS ===");
  cols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

  // Check world_instances data
  const wi = await client.query("SELECT * FROM world_instances LIMIT 3");
  console.log("\n=== world_instances DATA ===");
  wi.rows.forEach(r => console.log(" ", JSON.stringify(r)));

  // Check if the Y842 reports have correct company IDs
  const badReports = await client.query(
    "SELECT ar.company_id, ar.world_year, ar.world_month, ar.world_instance_id, c.name " +
    "FROM manufacturing_arc_reports ar LEFT JOIN companies c ON c.id = ar.company_id " +
    "WHERE ar.world_year > 100 LIMIT 5"
  );
  console.log("\n=== BAD ARC REPORTS ===");
  badReports.rows.forEach(r => console.log(`  company_id:${r.company_id} | year:${r.world_year} | name:${r.name} | instance:${r.world_instance_id}`));

  await client.end();
}
run().catch(console.error);
