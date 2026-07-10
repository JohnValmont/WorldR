import { db } from './src/config/database';
async function run() {
  try {
    const info = await db('characters').columnInfo();
    console.log(Object.keys(info));
  } catch(e) {
    console.error(e);
  } finally {
    db.destroy();
  }
}
run();
