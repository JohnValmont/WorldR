const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  try { await client.query("BEGIN; SELECT 1/0;"); } catch(e) {}
  
  console.log("connection keys:", Object.keys(client.connection));
  console.log("transactionStatus:", client.connection.transactionStatus);
  console.log("parsedStatements:", client.connection.parsedStatements);
  
  await client.end();
}
run().catch(console.error);
