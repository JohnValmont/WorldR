const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?connection_limit=1";

async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  const partyRes = await client.query(`SELECT id FROM pol_parties WHERE name = 'nbvnv'`);
  if (partyRes.rows.length === 0) { console.log("No party nbvnv"); return; }
  const partyId = partyRes.rows[0].id;
  
  const userRes = await client.query(`SELECT user_id, id FROM characters WHERE id IN (SELECT character_id FROM pol_party_members WHERE party_id = $1)`, [partyId]);
  const character = userRes.rows[0];

  try {
    await client.query("BEGIN");
    
    const member = await client.query(`SELECT * FROM pol_party_members WHERE party_id = $1 AND character_id = $2`, [partyId, character.id]);
    if (member.rows[0].role !== 'leader') throw new Error("not leader");

    const otherPlayers = await client.query(`SELECT * FROM pol_party_members WHERE party_id = $1 AND is_recruited_npc = false AND character_id != $2`, [partyId, character.id]);
    if (otherPlayers.rows.length > 0) throw new Error("other players");

    const coalitions = await client.query(`SELECT * FROM pol_coalitions FOR UPDATE`);
    // do nothing since logic just parses JSON

    const agreements = await client.query(`SELECT * FROM pol_coalition_agreements FOR UPDATE`);

    await client.query(`DELETE FROM pol_parties WHERE id = $1`, [partyId]);

    await client.query("ROLLBACK");
    console.log("Success! No DB error.");
  } catch(e) {
    console.error("Error in transaction:", e);
  }
  
  await client.end();
}
run().catch(console.error);
