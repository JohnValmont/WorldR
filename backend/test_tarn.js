const knex = require("knex");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";

const db = knex({
  client: 'pg',
  connection: PROD_URL,
  pool: {
    min: 1, max: 2,
    validate: async (conn) => {
      console.log("Validate called! Returning promise...");
      try {
        const res = await conn.query("SELECT 1 as val");
        console.log("Query result:", res.rows[0].val);
        return true;
      } catch (e) {
        return false;
      }
    }
  }
});

async function run() {
  await db.raw("SELECT 2");
  await db.destroy();
}
run().catch(console.error);
