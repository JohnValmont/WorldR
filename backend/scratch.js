const { db } = require('./dist/config/database.js');
const { runWorldTick } = require('./dist/api/services/worldTick.service.js');

async function main() {
  console.log('Connecting to DB...');
  await db.raw('SELECT 1');
  console.log('Running world tick...');
  try {
    const result = await runWorldTick({ force: true });
    console.log('Tick result:', result);
  } catch (err) {
    console.error('Tick crashed!', err);
  } finally {
    process.exit(0);
  }
}

main();
