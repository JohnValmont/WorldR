import { db } from './src/config/database';
import { ManufacturingController } from './src/api/controllers/manufacturing.controller';

async function testAll() {
  const companies = await db('companies').where({ industry_id: 'manufacturing', status: 'active' });
  console.log(`Testing ${companies.length} companies...`);
  
  for (const comp of companies) {
    const req = {
      user: { id: '1' },
      params: { companyId: comp.id }
    };
    
    const char = await db('characters').where({ id: comp.owner_character_id }).first();
    if (char) req.user.id = String(char.user_id);
    
    let hasError = false;
    const res = {
      json: (data: any) => {},
      status: (code: number) => res
    };
    const next = (err: any) => {
      console.error(`Error for ${comp.name}:`, err.message || err);
      hasError = true;
    };
    
    try {
      await ManufacturingController.getMarkets(req as any, res as any, next);
    } catch (e: any) {
      console.error(`Uncaught for ${comp.name}:`, e.message || e);
      hasError = true;
    }
    
    if (hasError) {
      console.log(`Company ${comp.name} FAILED!`);
    }
  }
  console.log('Done.');
  process.exit(0);
}

testAll().catch(console.error);
