import * as dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });
import knex from 'knex';

const db = knex({ client: 'pg', connection: process.env.DATABASE_URL, acquireConnectionTimeout: 10000 });

async function main() {
  // Get ALL companies with their exchange flags
  const all = await db('companies')
    .select('id','name','is_npc','status','is_exchange_listed','industry_id')
    .orderBy('name', 'asc');
  
  const listed = all.filter(c => c.is_exchange_listed);
  const activeNpc = all.filter(c => c.is_npc && c.status === 'active');
  const activePlayer = all.filter(c => !c.is_npc && c.status === 'active');
  
  console.log(`Total companies: ${all.length}`);
  console.log(`Exchange-listed: ${listed.length}`);
  console.log(`Active NPCs: ${activeNpc.length}`);
  console.log(`Active Players: ${activePlayer.length}`);
  
  if (listed.length > 0) {
    console.log('\nListed companies:');
    for (const c of listed) console.log(` ${c.name} | npc:${c.is_npc} | status:${c.status}`);
  }

  if (activeNpc.length > 0) {
    console.log('\nActive NPC companies (not listed):');
    for (const c of activeNpc) console.log(` ${c.name} | listed:${c.is_exchange_listed} | id:${c.id}`);
  }

  // Check share_price_history columns
  const sphCols = await db.raw(`SELECT column_name FROM information_schema.columns WHERE table_name = 'share_price_history'`);
  console.log('\nshare_price_history columns:', sphCols.rows.map((r:any) => r.column_name).join(', '));

  // Get recent share_price_history rows
  const sph = await db('share_price_history')
    .join('companies as c', 'c.id', 'share_price_history.company_id')
    .orderBy('share_price_history.id', 'desc')
    .limit(10)
    .select('c.name', 'c.is_npc', 'share_price_history.*');
  console.log('\nRecent share_price_history rows:');
  for (const r of sph) console.log(` ${r.name} | npc:${r.is_npc}`, JSON.stringify(r).slice(0,120));

  // Check company_shares columns  
  const csCols = await db.raw(`SELECT column_name FROM information_schema.columns WHERE table_name = 'company_shares'`);
  console.log('\ncompany_shares columns:', csCols.rows.map((r:any) => r.column_name).join(', '));

  // Total company_shares rows
  const csCount = await db('company_shares').count('* as cnt').first();
  console.log('company_shares total rows:', csCount?.cnt);

  // Check share_orders 
  const soCount = await db('share_orders').count('* as cnt').first();
  console.log('share_orders total rows:', soCount?.cnt);

  // Check share_trades
  const stCount = await db('share_trades').count('* as cnt').first();
  console.log('share_trades total rows:', stCount?.cnt);
  
  await db.destroy();
}
main().catch(e => { console.error(e.message); process.exit(1); });
