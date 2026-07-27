import { db } from './src/config/database';

async function run() {
  try {
    const res = await db.raw(process.argv[2]);
    console.log(JSON.stringify(res.rows || res, null, 2));
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
