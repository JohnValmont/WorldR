import { runPoliticsTick } from './src/api/services/worldTick.service';
import { db } from './src/config/database';

async function test() {
  try {
    const r = await runPoliticsTick({ force: false });
    console.log('Result:', r);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

test();
