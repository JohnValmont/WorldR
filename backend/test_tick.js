require('dotenv').config({ path: 'd:/WorldR/backend/.env' });
const { runWorldTick } = require('./src/api/services/worldTick.service');

async function testTick() {
  try {
    const res = await runWorldTick({ force: true });
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Tick Error:', err);
  }
  process.exit(0);
}

// Need to run via tsx because it requires typescript
// I'll just write a TS file instead.
