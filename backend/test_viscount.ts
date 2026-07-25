const { db } = require('./src/config/database');
async function test() {
  const models = await db('manufacturing_vehicle_models').where('name', 'like', '%Viscount%');
  console.log(models);
  process.exit(0);
}
test();
