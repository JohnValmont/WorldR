import { db } from './src/config/database';
async function run() {
  try {
    const users = await db('users').select('*');
    console.log(users);
  } catch(e) {
    console.error(e);
  } finally {
    db.destroy();
  }
}
run();
