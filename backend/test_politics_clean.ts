import { db } from './src/config/database';
import { getPolls, getCouncil } from './src/api/controllers/politics.controller';

async function run() {
  // @ts-ignore
  const req: any = { query: { stateId: 'ironvale' }, user: { id: null } };
  const res: any = {
    json: (data: any) => console.log('Data returned keys:', Object.keys(data)),
    status: (code: number) => ({ json: (data: any) => console.log('Status:', code, data) })
  };
  const next = (err: any) => console.error('Next called with Error:', err.message, err.errorCode);

  console.log('Testing getPolls...');
  await getPolls(req, res, next);
  
  console.log('Testing getCouncil...');
  await getCouncil(req, res, next);
  
  console.log('Done.');
  process.exit(0);
}

run().catch(console.error);
