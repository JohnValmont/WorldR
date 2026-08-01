import { db } from './src/config/database';
import { ManufacturingController } from './src/api/controllers/manufacturing.controller';

async function testProcess() {
  try {
    const clock = await db('world_clock').first();
    console.log('Clock:', clock);
    
    // Find Aldrich Automobiles
    const company = await db('companies').where({ name: 'Aldrich Automobiles' }).first();
    if (!company) {
      console.log('Company not found');
      return;
    }
    
    console.log('Running processCountryMonth for country:', company.country_id);
    await db.transaction(async (trx: any) => {
      const outcome = await ManufacturingController.processCountryMonth(trx, company.country_id, clock);
      console.log('Outcome:', outcome);
      throw new Error('ROLLBACK_INTENTIONAL');
    });
  } catch (err) {
    console.error('Error during processing:', err);
  } finally {
    process.exit(0);
  }
}

testProcess();
