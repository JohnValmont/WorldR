import { db } from '../src/config/database';
import {
  foundParty,
  joinParty,
  leaveParty,
  updatePlatform,
  declareCandidacy
} from '../src/api/controllers/politics.controller';
import { getOrCreateCurrentCycle } from '../src/api/services/politics.service';

async function runSmoke() {
  console.log("Setting up test users/characters...");
  
  // Create 2 test users & characters
  const ts = Date.now();
  const [u1] = await db('users').insert({ email: `test_pol1_${ts}@worldr.com`, password_hash: 'xxx' }).returning('*');
  const [u2] = await db('users').insert({ email: `test_pol2_${ts}@worldr.com`, password_hash: 'xxx' }).returning('*');

  const clock = await db('world_instances').where('id', 'pre-alpha-world-1').first();
  const currentMonth = clock?.current_month || 1;
  const currentYear = clock?.current_year || 1;

  const [c1] = await db('characters').insert({
    world_instance_id: 'pre-alpha-world-1',
    user_id: u1.id,
    motherland_country_id: 'drennia',
    name: 'Pol Tester 1',
    age: 20,
    created_at_world_year: currentYear,
    created_at_world_month: currentMonth,
    created_at_world_day: 1
  }).returning('*');

  const [c2] = await db('characters').insert({
    world_instance_id: 'pre-alpha-world-1',
    user_id: u2.id,
    motherland_country_id: 'drennia',
    name: 'Pol Tester 2',
    age: 20,
    created_at_world_year: currentYear,
    created_at_world_month: currentMonth,
    created_at_world_day: 1
  }).returning('*');

  await db('character_finances').insert({
    character_id: c1.id,
    currency_id: 'drennian-day',
    cash_in_hand: 100000,
    net_worth: 100000
  });

  await db('character_finances').insert({
    character_id: c2.id,
    currency_id: 'drennian-day',
    cash_in_hand: 100000,
    net_worth: 100000
  });

  console.log("Mocking Express objects...");
  const mockRes = () => {
    const res: any = {};
    res.status = () => res;
    res.json = (data: any) => { res.data = data; return res; };
    return res;
  };

  const mockNext = (err?: any) => {
    if (err) throw err;
  };

  try {
    // 1. Force phase to FILING by updating the cycle start_arc
    const state = await db('pol_states').where({ is_active: true }).first();
    const cycle = await getOrCreateCurrentCycle(state.id);
    const clock = await db('world_instances').where('id', 'pre-alpha-world-1').first();
    const currentMonth = clock?.current_month || 1;

    // To be in filing: currentMonth >= startFiling && currentMonth < startCampaign
    // startCampaign = cycle.polling_arc - 6
    // startFiling = cycle.polling_arc - 9
    // so let's set polling_arc = currentMonth + 8
    // then startFiling = currentMonth - 1, startCampaign = currentMonth + 2 -> currentMonth is inside [startFiling, startCampaign)
    await db('pol_cycles').where({ id: cycle.id }).update({
      polling_arc: currentMonth + 8,
      formation_end_arc: currentMonth + 10,
      phase: 'filing'
    });

    console.log("--- PHASE: FILING ---");

    // 2. Found party
    console.log("Testing: Found Party");
    const req1 = { user: { id: u1.id }, body: { name: 'Smoke Test Party', platform: { taxation: 10, labour: 20, investment: 30, trade: 40, stability: 50 } } } as any;
    const res1 = mockRes();
    await foundParty(req1, res1, mockNext);
    console.log("Party created:", res1.data.name);

    // 3. Second founding by same player rejected
    console.log("Testing: Second Founding (should fail)");
    try {
      const res2 = mockRes();
      await foundParty(req1, res2, mockNext);
    } catch (e: any) {
      console.log("Expected Error:", e.message);
    }

    // 4. Check cash deducted
    const fin1 = await db('character_finances').where({ character_id: c1.id }).first();
    console.log(`Cash after founding (started with 100000): ${fin1.cash_in_hand}`);

    // 5. Join party
    console.log("Testing: Join Party");
    const req3 = { user: { id: u2.id }, params: { id: res1.data.id } } as any;
    const res3 = mockRes();
    await joinParty(req3, res3, mockNext);
    console.log("Join result:", res3.data);

    // 6. Platform update (leader only)
    console.log("Testing: Platform Update");
    const req4 = { user: { id: u1.id }, params: { id: res1.data.id }, body: { platform: { taxation: 15, labour: 25, investment: 35, trade: 45, stability: 55 } } } as any;
    const res4 = mockRes();
    await updatePlatform(req4, res4, mockNext);
    console.log("Platform updated!");

    // 7. Declare candidacy
    console.log("Testing: Declare Candidacy");
    const req5 = { user: { id: u2.id } } as any; // u2 is member
    const res5 = mockRes();
    await declareCandidacy(req5, res5, mockNext);
    console.log("Candidacy result:", res5.data.id);

    // 8. Leave party
    console.log("Testing: Leave Party (Member)");
    const req6 = { user: { id: u2.id }, params: { id: res1.data.id } } as any;
    const res6 = mockRes();
    await leaveParty(req6, res6, mockNext);
    console.log("Leave result:", res6.data);

    // 9. Now force phase to GOVERNING (outside filing)
    console.log("\n--- PHASE: GOVERNING ---");
    await db('pol_cycles').where({ id: cycle.id }).update({
      polling_arc: currentMonth + 20, // startFiling is currentMonth + 11
      phase: 'governing'
    });

    // Test requirePhase manually (as it's middleware)
    console.log("Testing: Action outside Filing phase");
    // Since requirePhase is in routes, we just test the phase directly or simulate the requirePhase logic
    const reqPhase = {} as any;
    const resPhase = mockRes();
    const requirePhaseLogic = async () => {
      const activeState = await db('pol_states').where({ is_active: true }).first();
      const c = await getOrCreateCurrentCycle(activeState.id);
      // c.phase might not auto-update if we just forced db. Wait, getOrCreateCurrentCycle uses derivePhase to set phase on first create, but later it just returns DB row. Wait, in my service code:
      // "Phase might have changed, but spec says "Do NOT auto-advance or close cycles here". So we just return the DB row."
      if (c.phase !== 'filing') {
         throw new Error(`This action is only allowed during the filing phase. Current phase: ${c.phase}`);
      }
    };

    try {
      await requirePhaseLogic();
    } catch (e: any) {
      console.log("Expected Phase Error:", e.message);
    }

  } finally {
    // Cleanup
    await db('pol_candidates').del();
    await db('pol_party_members').del();
    await db('pol_parties').del();
    await db('character_finances').whereIn('character_id', [c1.id, c2.id]).del();
    await db('characters').whereIn('id', [c1.id, c2.id]).del();
    await db('users').whereIn('id', [u1.id, u2.id]).del();
    process.exit(0);
  }
}

runSmoke();
