import { db } from '../src/config/database';

async function run() {
  try {
    const clock = await db('world_clock').first();
    console.log('Clock:', clock);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

run();
