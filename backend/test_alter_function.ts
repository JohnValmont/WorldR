import { db } from './src/config/database';

async function main() {
  try {
    await db.raw(`ALTER FUNCTION generate_user_id() SET search_path = public;`);
    console.log('Successfully altered generate_user_id');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
main();
