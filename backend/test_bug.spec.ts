import { db } from './src/config/database';
import { ManufacturingController } from './src/api/controllers/manufacturing.controller';

describe('Bug Test', () => {
  it('should run processCountryMonth without error', async () => {
    const clock = await db('world_clock').first();
    const firstCompany = await db('companies').where({ industry_id: 'manufacturing' }).first();
    if (!firstCompany) return;
    
    await db.transaction(async (trx) => {
      try {
        await ManufacturingController.processCountryMonth(trx as any, firstCompany.country_id, clock);
        throw new Error('ROLLBACK_TEST');
      } catch (err: any) {
        if (err.message !== 'ROLLBACK_TEST') {
          console.error(err);
          throw err;
        }
      }
    });
  });
});
