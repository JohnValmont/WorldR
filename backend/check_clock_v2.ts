import { db } from './src/config/database';
import { runWorldTick } from './src/api/services/worldTick.service';

async function main() {
  console.log('Force ticking the world...');
  try {
    const result = await runWorldTick({ force: true });
    console.log('Tick result:', result);
    
    // check clock again
    const clock = await db('world_clock').first();
    console.log('Clock after tick:', clock);
  } catch (err) {
    console.error('Tick error:', err);
  }
  process.exit(0);
}

main().catch(console.error);
