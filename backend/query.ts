import { db } from './src/config/database';

async function run() {
  const user = await db('users').where({ email: 'system_npc@worldr.game' }).first();
  if (!user) return console.log('no sys user');
  const char = await db('characters').where({ user_id: user.id }).first();
  if (!char) return console.log('no sys char');
  const fin = await db('character_finances').where({ character_id: char.id }).first();
  console.log('finances:', fin);
  process.exit(0);
}
run();
