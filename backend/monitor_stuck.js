const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";

async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let count = 0;
  const check = async () => {
    const stuck = await client.query(
      "SELECT pid, state, state_change, application_name, LEFT(query, 200) as query " +
      "FROM pg_stat_activity " +
      "WHERE (state = 'idle in transaction (aborted)' OR state = 'idle in transaction') " +
      "AND datname = current_database()"
    );
    
    if (stuck.rows.length > 0) {
      console.log("\n!!! STUCK TRANSACTION DETECTED at", new Date().toISOString(), "!!!");
      stuck.rows.forEach(r => {
        console.log("  PID:", r.pid, "| State:", r.state, "| Since:", r.state_change);
        console.log("  Query:", r.query);
      });
      
      // Kill it
      for (const row of stuck.rows) {
        const res = await client.query("SELECT pg_terminate_backend($1)", [row.pid]);
        console.log("  Killed PID", row.pid, ":", res.rows[0].pg_terminate_backend);
      }
    } else {
      count++;
      if (count % 6 === 0) process.stdout.write(".");
    }
  };

  console.log("Monitoring for stuck transactions (checking every 10s)... Press Ctrl+C to stop.");
  await check();
  const timer = setInterval(check, 10000);
  
  setTimeout(() => {
    clearInterval(timer);
    client.end();
    console.log("\nDone monitoring after 10 minutes.");
    process.exit(0);
  }, 600000); // 10 minutes
}
run().catch(console.error);
