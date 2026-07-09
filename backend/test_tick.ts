
import knex from 'knex';
import config from './src/knexfile';
import { ManufacturingController } from './src/api/controllers/manufacturing.controller';

const db = knex(config.development);

async function run() {
  try {
    const clock = await db('world_clock').first();
    console.log('Clock:', clock);
    
    await db.transaction(async (trx) => {
      console.log('Running processCountryMonth for drennia-drennport');
      const result = await ManufacturingController.processCountryMonth(trx, 'drennia-drennport', clock);
      console.log('Result:', result);
      // rollback so we don't change data
      throw new Error('ROLLBACK');
    });
  } catch (err) {
    if (err.message !== 'ROLLBACK') {
      console.error('CRASH:', err);
    } else {
      console.log('Success and rolled back');
    }
  }
  process.exit(0);
}
run();

