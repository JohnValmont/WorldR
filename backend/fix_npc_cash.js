require('dotenv').config();
const knex = require('knex')({ client: 'pg', connection: process.env.DATABASE_URL });
async function main() {
  const sysUser = await knex('users').where({ email: 'system_npc@worldr.game' }).first();
  const sysChar = await knex('characters').where({ user_id: sysUser.id }).orderBy('created_at', 'asc').first();
  const before = await knex('character_finances').where({ character_id: sysChar.id }).first();
  console.log('Before:', Number(before?.cash_in_hand ?? 0).toLocaleString());
  await knex('character_finances').where({ character_id: sysChar.id }).update({ cash_in_hand: 0 });
  console.log('After: 0 — done.');
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
