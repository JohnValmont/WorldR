const knex = require('knex');
const ManufacturingController = require('./src/api/controllers/manufacturing.controller').default;

const db = knex({
  client: 'pg',
  connection: 'postgres://postgres:postgres@localhost:5432/worldr_db'
});

async function run() {
  try {
    const comp = await db('companies').where({ id: '0c564fdf-ee01-4ad2-b123-50df61e73093' }).first();
    const clock = await db('world_clock').first();
    console.log('Running processCountryMonth for country:', comp.country_id, 'Month:', clock.current_year, clock.current_month);
    
    await db.transaction(async (trx) => {
      const result = await ManufacturingController.processCountryMonth(trx, comp.country_id, clock);
      console.log('Result:', result);
      throw new Error('INTENTIONAL_ROLLBACK');
    });
  } catch (e) {
    console.error('Error during tick:', e);
  } finally {
    db.destroy();
  }
}
run();
