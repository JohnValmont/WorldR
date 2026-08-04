import { db } from './src/config/database';
async function main() {
  const clock = await db('world_clock').first();
  console.log('Clock:', clock);
  process.exit(0);
}
main();
