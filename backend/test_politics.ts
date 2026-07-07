import { db } from './src/config/database';
import { getPolls, getCouncil } from './src/api/controllers/politics.controller';

async function run() {
  const req: any = { query: { stateId: 'ironvale' } };
  const res: any = {
    json: (data: any) => console.log('Success'),
    status: (code: number) => ({ json: (data: any) => console.log('Status:', code, data) })
  };
  const next = (err: any) => console.error('Error:', err);

  console.log('Testing getPolls...');
  await getPolls(req, res, next);
  
  console.log('Testing getCouncil...');
  await getCouncil(req, res, next);
  
  process.exit(0);
}
run();
