const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function check() {
  const activeInstance = await pool.query("SELECT id FROM world_instances WHERE status = 'active' LIMIT 1");
  const instanceId = activeInstance.rows[0].id;
  console.log("Active Instance ID:", instanceId);
  const latestSale = await pool.query("SELECT world_year, world_month FROM manufacturing_sales_results WHERE world_instance_id = $1 AND world_year <= 6 ORDER BY world_year DESC, world_month DESC LIMIT 1", [instanceId]);
  console.log("Latest Sale:", latestSale.rows[0]);
  pool.end();
}
check().catch(console.error);
