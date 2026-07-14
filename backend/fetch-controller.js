const { ManufacturingController } = require('./src/api/controllers/manufacturing.controller.ts');
const { db } = require('./src/config/database.ts');

require('ts-node').register({ transpileOnly: true });

async function run() {
  const { ManufacturingController } = require('./src/api/controllers/manufacturing.controller.ts');
  const companyId = '0c564fdf-ee01-4ad2-b123-50df61e73093';

  // Get owner
  const { db } = require('./src/config/database');
  const comp = await db('companies').where({ id: companyId }).first();
  const char = await db('characters').where({ id: comp.owner_character_id }).first();
  
  const req = {
    user: { id: char.user_id },
    params: { companyId }
  };
  
  const res = {
    status: (code) => { console.log('STATUS:', code); return res; },
    json: (data) => { console.log('JSON returned', Object.keys(data)); return res; }
  };

  try {
    await ManufacturingController.getCompanyManufacturingData(req, res, (err) => console.error('Next called with', err));
    console.log('Done');
  } catch(e) {
    console.error('CRASH:', e);
  } finally {
    process.exit(0);
  }
}

run();
