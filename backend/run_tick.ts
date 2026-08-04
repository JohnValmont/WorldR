import { runWorldTick } from './src/api/services/worldTick.service';

async function main() {
  console.log('Starting forced world tick...');
  try {
    const res = await runWorldTick({ force: true });
    console.log('Result:', res);
  } catch (err) {
    console.error('Tick failed with error:', err);
  }
  process.exit(0);
}
main();
