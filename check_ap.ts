import { db } from './backend/src/config/database';
async function run() {
  const ap = await db('pol_character_ap').select('*');
  console.log(ap);
  process.exit(0);
}
run();
