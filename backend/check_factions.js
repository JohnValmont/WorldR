const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const party = await client.query(`SELECT id, name FROM pol_parties WHERE name = 'nbvnv' LIMIT 1`);
  if (party.rows.length === 0) {
    console.log("Party not found");
    return;
  }
  const pid = party.rows[0].id;
  console.log("Party:", party.rows[0].name);

  const factions = await client.query(`SELECT id, name, membership_share, loyalty, is_restless, demand_type, demand_payload FROM pol_party_factions WHERE party_id = $1 ORDER BY membership_share DESC`, [pid]);
  console.log("Factions:", JSON.stringify(factions.rows, null, 2));

  await client.end();
}
run().catch(console.error);
