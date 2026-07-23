import { BankController } from './src/api/controllers/bank.controller';
import { db } from './src/config/database';

async function run() {
  const req = {
    params: { companyId: '7cb02bac-0e6f-4c76-a75e-ade53c50bd6f' },
    user: { id: '4c0f29e7-d1ac-4167-81dd-d1cdd5c484a8' }
  } as any;

  const res = {
    status: (code: number) => {
      console.log('STATUS:', code);
      return res;
    },
    json: (data: any) => {
      console.log('JSON:', data);
    }
  } as any;

  const next = (error: any) => {
    console.error('NEXT CALLED WITH ERROR:', error);
  };

  try {
    await BankController.getCreditDossier(req, res, next);
  } catch (err) {
    console.error('UNCAUGHT ERROR:', err);
  } finally {
    await db.destroy();
  }
}

run();
