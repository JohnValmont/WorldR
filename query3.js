
const { db } = require('./backend/src/config/database');
async function test() {
  const clock = await db('world_clock').first();
  console.log('Clock:', clock);
  const factory = await db('manufacturing_factories').first();
  console.log('Factory:', factory);
  process.exit(0);
}
test();
