import { db } from './src/config/database';
import { getStateOverview, getCycle, getParties, getBills, getMyAp } from './src/api/controllers/politics.controller';
import { CharacterController } from './src/api/controllers/character.controller';

async function check() {
  try {
    const user = await db('users').first();
    const req = { user: { id: user.id }, query: { stateId: 'national' } } as any;
    const res = { 
      json: (d: any) => console.log('JSON:', d ? 'Has data' : 'Empty'),
      status: (c: number) => ({ json: (d: any) => console.log('Status', c, d) })
    } as any;
    const next = (e: any) => console.log('NEXT ERROR:', e);

    console.log('--- getMe ---');
    await CharacterController.getMe(req, res, next);

    console.log('--- getStateOverview ---');
    await getStateOverview(req, res, next);

    console.log('--- getParties ---');
    await getParties(req, res, next);
    
    console.log('--- getBills ---');
    await getBills(req, res, next);

    console.log('--- getMyAp ---');
    await getMyAp(req, res, next);

    db.destroy();
  } catch(e) { console.error('FATAL', e); db.destroy(); }
}
check();
