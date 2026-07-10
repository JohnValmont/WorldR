import { db } from './src/config/database';
async function run() {
  try {
    const info = await db('users').columnInfo();
    console.log(info.id.type);
  } catch(e) {
    console.error(e);
  } finally {
    db.destroy();
  }
}
run();
