const { db } = require('./src/database/db');
const { ManufacturingController } = require('./src/api/controllers/manufacturing.controller');

async function run() {
  try {
    const clock = await db('world_clock').first();
    console.log('Clock:', clock);
    
    // Attempt to process for country 'drennia' which is where the player usually is
    // Let's just process whatever country is in the DB
    const playerCompany = await db('companies').where({ owner_character_id: 'some_id' }).first(); // I don't know the character ID, let's just get the first company
    const firstCompany = await db('companies').where({ industry_id: 'manufacturing' }).first();
    if (!firstCompany) {
      console.log('No manufacturing company found');
      process.exit(0);
    }
    
    console.log('Testing processCountryMonth for country:', firstCompany.country_id);
    
    await db.transaction(async (trx) => {
      try {
        const outcome = await ManufacturingController.processCountryMonth(trx, firstCompany.country_id, clock);
        console.log('Outcome:', outcome);
        // Rollback so we don't accidentally advance the real data during test
        throw new Error('ROLLBACK_TEST');
      } catch (err) {
        if (err.message === 'ROLLBACK_TEST') {
          console.log('Success and rolled back');
        } else {
          console.error('Error during processCountryMonth:', err);
        }
        throw err;
      }
    });

  } catch (err) {
    if (err.message !== 'ROLLBACK_TEST') {
      console.error('Outer catch:', err);
    }
  } finally {
    process.exit(0);
  }
}

// Since the app uses TS and ES modules, requiring it might fail due to "Cannot use import statement outside a module".
// We can use ts-node to run this script.
run();
