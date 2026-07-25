const knex = require('knex');
const ManufacturingController = require('./src/api/controllers/manufacturing.controller').default;

const db = knex({
  client: 'pg',
  connection: 'postgres://postgres:postgres@localhost:5432/worldr_db'
});

async function run() {
  try {
    const clock = { current_year: 5, current_month: 4 };
    console.log('Running processCountryMonth for Y5 M4...');
    await db.transaction(async (trx) => {
      const result = await ManufacturingController.processCountryMonth(trx, 'drennia', clock);
      console.log('Result:', result);
    });
  } catch (e) {
    console.error('Error during tick:', e);
  } finally {
    db.destroy();
  }
}
run();
