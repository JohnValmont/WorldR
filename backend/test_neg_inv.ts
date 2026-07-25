const { db } = require('./src/config/database');
async function test() {
  const invs = await db('manufacturing_inventory').where('units_in_stock', '<', 0);
  console.log(invs);
  process.exit(0);
}
test();
