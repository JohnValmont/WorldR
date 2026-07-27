const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?connection_limit=1";

async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  // Find a player party
  const partyRes = await client.query(`SELECT id FROM pol_parties WHERE name = 'nbvnv'`);
  if (partyRes.rows.length === 0) { console.log("No party nbvnv"); return; }
  const partyId = partyRes.rows[0].id;
  
  try {
    await client.query("BEGIN");
    
    // Check if there are other player members
    const otherPlayers = await client.query(`SELECT * FROM pol_party_members WHERE party_id = $1 AND is_recruited_npc = false`, [partyId]);
    console.log('Player members:', otherPlayers.rows);

    await client.query(`DELETE FROM pol_parties WHERE id = $1`, [partyId]);
    await client.query("ROLLBACK"); // Rollback so we don't actually delete it yet
    console.log("Delete would succeed!");
  } catch(e) {
    console.error("Delete failed:", e.message);
  }
  
  await client.end();
}
run().catch(console.error);
