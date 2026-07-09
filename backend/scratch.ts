import { db } from './src/config/database';
import { runWorldTick } from './src/api/services/worldTick.service';

async function main() {
  console.log('Connecting to DB...');
  await db.raw('SELECT 1');
  console.log('Running world tick...');
  try {
    const result = await runWorldTick({ force: true });
    console.log('Tick result:', result);
  } catch (err: any) {
    console.error('Tick crashed!', err);
    console.error(err.stack);
  } finally {
    process.exit(0);
  }
}

main();
