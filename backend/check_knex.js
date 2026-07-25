const { db } = require('./src/config/database');
async function run() {
  console.log(await db('companies').select('id', 'name', 'legal_structure_id', 'is_npc'));
  console.log(await db('legal_structures').select('*'));
  process.exit(0);
}
run().catch(console.error);