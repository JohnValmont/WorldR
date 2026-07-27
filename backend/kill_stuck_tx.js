const { Client } = require("pg");

const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";

async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("--- Checking for stuck transactions ---");
  const stuck = await client.query(
    "SELECT pid, state, query_start, state_change, application_name, query " +
    "FROM pg_stat_activity " +
    "WHERE state = 'idle in transaction (aborted)' OR state = 'idle in transaction' " +
    "ORDER BY state_change ASC"
  );

  console.log("Stuck sessions:", stuck.rows.length);
  stuck.rows.forEach(function(r) {
    console.log("  PID:", r.pid, "| State:", r.state, "| Since:", r.state_change, "| App:", r.application_name);
    console.log("  Query:", r.query ? r.query.substring(0, 100) : "null");
  });

  if (stuck.rows.length > 0) {
    console.log("\n--- Terminating stuck sessions ---");
    for (var i = 0; i < stuck.rows.length; i++) {
      var row = stuck.rows[i];
      try {
        var res = await client.query("SELECT pg_terminate_backend($1)", [row.pid]);
        console.log("Terminated PID", row.pid, ":", res.rows[0].pg_terminate_backend);
      } catch (e) {
        console.log("Could not terminate PID", row.pid, ":", e.message);
      }
    }
    console.log("Done!");
  } else {
    console.log("No stuck transactions. Showing all connections:");
    var all = await client.query(
      "SELECT pid, state, application_name, LEFT(query, 80) as q " +
      "FROM pg_stat_activity WHERE datname = current_database() LIMIT 20"
    );
    all.rows.forEach(function(r) {
      console.log("  PID:", r.pid, "| State:", r.state, "| App:", r.application_name, "| Q:", r.q);
    });
  }

  await client.end();
}

run().catch(function(e) { console.error("Error:", e.message); process.exit(1); });
