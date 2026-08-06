import { db } from './src/config/database';
import { ManufacturingController } from './src/api/controllers/manufacturing.controller';

async function run() {
  try {
    const clock = await db('world_clock').first();
    console.log('Clock:', clock);
    
    const firstCompany = await db('companies').where({ industry_id: 'manufacturing' }).first();
    if (!firstCompany) {
      console.log('No manufacturing company found');
      process.exit(0);
    }
    
    console.log('Testing processCountryMonth for country:', firstCompany.country_id);
    
    await db.transaction(async (trx) => {
      try {
        const outcome = await ManufacturingController.processCountryMonth(trx as any, firstCompany.country_id, clock);
        console.log('Outcome:', outcome);
        throw new Error('ROLLBACK_TEST');
      } catch (err: any) {
        if (err.message === 'ROLLBACK_TEST') {
          console.log('Success and rolled back');
        } else {
          console.error('Error during processCountryMonth:', err);
        }
        throw err;
      }
    });

  } catch (err: any) {
    if (err.message !== 'ROLLBACK_TEST') {
      console.error('Outer catch:', err);
    }
  } finally {
    process.exit(0);
  }
}

run();
