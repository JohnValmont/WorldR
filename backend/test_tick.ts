import { runWorldTick } from './src/api/services/worldTick.service';
import { db } from './src/config/database';

async function testTick() {
  console.log('Running tick...');
  try {
    const res = await runWorldTick({ force: true });
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Tick Error:', err);
  } finally {
    db.destroy();
  }
}
testTick();
