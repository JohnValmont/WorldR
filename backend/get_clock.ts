import { db } from ./src/database/db; async function run() { const clock = await db(world_clock).first(); console.log(clock); process.exit(0); } run();
