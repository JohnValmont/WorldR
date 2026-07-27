const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Check what companies have Y842 arc reports
  const y842 = await client.query(
    "SELECT ar.company_id, c.name, c.is_npc, ar.world_year, ar.world_month " +
    "FROM manufacturing_arc_reports ar " +
    "JOIN companies c ON c.id = ar.company_id " +
    "WHERE ar.world_year = 842 " +
    "ORDER BY ar.company_id, ar.world_month LIMIT 20"
  );
  console.log("=== Y842 ARC REPORTS ===");
  y842.rows.forEach(r => console.log(`  ${r.name} (NPC:${r.is_npc}) -> Y${r.world_year} M${r.world_month}`));

  // Check world clock actual value vs what NPCs see
  const clocks = await client.query("SELECT id, world_instance_id, current_year, current_month FROM world_clock");
  console.log("\n=== ALL WORLD CLOCKS ===");
  clocks.rows.forEach(r => console.log(`  instance:${r.world_instance_id} -> Y${r.current_year} M${r.current_month}`));

  // Check if world_instances has weirdness
  const instances = await client.query("SELECT id, name, status FROM world_instances");
  console.log("\n=== WORLD INSTANCES ===");
  instances.rows.forEach(r => console.log(`  ${r.id}: ${r.name} (${r.status})`));

  // Check if the Y842 arc reports have a different world_instance_id
  const instCheck = await client.query(
    "SELECT ar.world_instance_id, ar.world_year, ar.world_month, COUNT(*) as cnt " +
    "FROM manufacturing_arc_reports ar " +
    "WHERE ar.world_year > 100 " +
    "GROUP BY ar.world_instance_id, ar.world_year, ar.world_month"
  );
  console.log("\n=== HIGH-YEAR REPORTS BY INSTANCE ===");
  instCheck.rows.forEach(r => console.log(`  Instance:${r.world_instance_id} Y${r.world_year} M${r.world_month}: ${r.cnt} reports`));

  await client.end();
}
run().catch(console.error);
