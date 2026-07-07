import Knex from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const db = Knex({
  client: 'pg',
  connection: process.env.DATABASE_URL
});

async function run() {
  try {
    // 1. Delete all non-NPC companies
    const deletedComps = await db('companies').where('is_npc', false).del();
    console.log(`Deleted ${deletedComps} player companies.`);

    // 2. Find the system user / character that owns NPC companies
    const npcCompany = await db('companies').where('is_npc', true).first();
    const sysCharId = npcCompany ? npcCompany.owner_character_id : null;

    let sysUserId = null;
    if (sysCharId) {
      const sysChar = await db('characters').where('id', sysCharId).first();
      if (sysChar) {
        sysUserId = sysChar.user_id;
      }
    }

    // 3. Delete characters that are NOT the system character
    const charQuery = db('characters');
    if (sysCharId) {
      charQuery.whereNot('id', sysCharId);
    }
    const deletedChars = await charQuery.del();
    console.log(`Deleted ${deletedChars} player characters.`);

    // 4. Delete users that are NOT the system user
    const userQuery = db('users');
    if (sysUserId) {
      userQuery.whereNot('id', sysUserId);
    }
    const deletedUsers = await userQuery.del();
    console.log(`Deleted ${deletedUsers} users.`);

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
