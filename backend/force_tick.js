const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Check if world_clock row is locked right now
  const locks = await client.query(`
    SELECT pid, state, wait_event_type, wait_event, LEFT(query,150) as q 
    FROM pg_stat_activity 
    WHERE query ILIKE '%world_clock%' 
       OR query ILIKE '%manufacturing_arc_reports%'
       OR query ILIKE '%processCountry%'
    ORDER BY state`
  );
  console.log("=== QUERIES TOUCHING WORLD_CLOCK / ARC_REPORTS ===");
  if (locks.rows.length === 0) console.log("  None found");
  else locks.rows.forEach(r => console.log(`  PID:${r.pid} | ${r.state} | wait:${r.wait_event_type}/${r.wait_event} | Q: ${r.q}`));

  // Check lock contention on world_clock specifically
  const pgLocks = await client.query(`
    SELECT l.pid, l.granted, l.mode, l.relation::regclass, a.state, LEFT(a.query,100) as q
    FROM pg_locks l 
    JOIN pg_stat_activity a ON a.pid = l.pid
    WHERE l.relation = 'world_clock'::regclass`
  );
  console.log("\n=== LOCKS ON world_clock ===");
  if (pgLocks.rows.length === 0) console.log("  No locks");
  else pgLocks.rows.forEach(r => console.log(`  PID:${r.pid} | granted:${r.granted} | mode:${r.mode} | state:${r.state} | Q:${r.q}`));

  // Get current month status
  const clock = await client.query("SELECT current_year, current_month, next_arc_close_at, status FROM world_clock");
  console.log("\n=== WORLD CLOCK ===");
  const c = clock.rows[0];
  const overdue = (Date.now() - new Date(c.next_arc_close_at).getTime()) / 1000;
  console.log(`  Y${c.current_year} M${c.current_month} | status:${c.status} | OVERDUE by ${Math.round(overdue)}s`);

  await client.end();
}
run().catch(console.error);
