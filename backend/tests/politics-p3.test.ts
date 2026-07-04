import { db } from '../src/config/database';
import { processPoliticalArc, getOrCreateCurrentCycle, buildEngineCandidates } from '../src/api/services/politics.service';
import { POL_NPC_MAX_SPEND_FRAC } from '../src/api/constants/politics';
import { runElection } from '../src/api/services/electionEngine';
import assert from 'assert';

async function runTest() {
  console.log('--- Starting Politics P3A Tests ---');

  const state = await db('pol_states').where({ is_active: true }).first();
  if (!state) throw new Error('No active state');

  const cycle = await getOrCreateCurrentCycle(state.id);

  console.log('Testing NPC clamp and brain logic...');
  const currentMonth = cycle.polling_arc - 5;
  // Ensure NPCs exist
  await processPoliticalArc(db, state.id, currentMonth - 1);
  await processPoliticalArc(db, state.id, currentMonth);
  
  const npcParties = await db('pol_parties').where({ is_npc: true, state_id: state.id });
  for (const p of npcParties) {
    const treasury = Number(p.treasury || 0);
    assert(treasury >= 0, `Treasury went negative: ${treasury}`);
    console.log(`NPC Party ${p.name} has treasury: ${treasury}`);
  }

  console.log('Testing Idempotency...');
  const actions1 = await db('pol_campaign_actions').where({ cycle_id: cycle.id });
  await processPoliticalArc(db, state.id, currentMonth);
  const actions2 = await db('pol_campaign_actions').where({ cycle_id: cycle.id });
  
  assert.strictEqual(actions1.length, actions2.length, 'Idempotency failed: generated more actions on rerun');

  console.log('Testing Cross-Month Idempotency (cash deducted exactly once over two months)...');
  const testParty = await db('pol_parties').insert({
    state_id: state.id,
    name: 'Cross Month Test Party',
    platform: { taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50 },
    treasury: 50000,
    is_npc: false,
    created_arc: 1
  }).returning('*').then(r => r[0]);

  const character = await db('characters').first();
  const testCand = await db('pol_candidates').insert({
    cycle_id: cycle.id,
    party_id: testParty.id,
    is_npc: false,
    character_id: character.id,
    platform: testParty.platform,
    is_incumbent: false
  }).returning('*').then(r => r[0]);

  await db('pol_campaign_actions').insert({
    cycle_id: cycle.id,
    candidate_id: testCand.id,
    action_type: 'media_ad',
    target_segment: null,
    cash_spent: 0,
    effort: 0,
    resolved_arc: currentMonth + 1
  });

  // Advance first month (resolves action)
  await processPoliticalArc(db, state.id, currentMonth + 1);
  const partyAfter1 = await db('pol_parties').where({ id: testParty.id }).first();
  const spent1 = 50000 - Number(partyAfter1.treasury);

  // Advance second month
  await processPoliticalArc(db, state.id, currentMonth + 2);
  const partyAfter2 = await db('pol_parties').where({ id: testParty.id }).first();
  const spent2 = 50000 - Number(partyAfter2.treasury);

  assert.strictEqual(spent1, 12000, `Expected 12000 spent on month 1, got ${spent1}`);
  assert.strictEqual(spent2, 12000, `Expected exactly 12000 total spent after month 2, got ${spent2} (double charged!)`);

  console.log('Testing Skipped Action Effort (-1 should not be summed)...');
  // Add a skipped action
  await db('pol_campaign_actions').insert({
    cycle_id: cycle.id,
    candidate_id: testCand.id,
    action_type: 'rally',
    target_segment: 'industrial_workers',
    cash_spent: 0,
    effort: -1, // skipped sentinel
    resolved_arc: currentMonth + 1
  });
  const engineCands = await buildEngineCandidates(db, cycle.id);
  const testEngineCand = engineCands.find((c: any) => c.candidateId === testCand.id);
  if (!testEngineCand) throw new Error('Test candidate not found in engine candidates');
  
  // Effort for rally is 4, but skipped so it should be 0. We also had a media_ad (effort 18) which was untargeted, so it split 18/5 = 3.6 per segment.
  const rallyEffort = testEngineCand.effortBySegment['industrial_workers'];
  assert(rallyEffort < 4, `Skipped action effort was summed! Effort is ${rallyEffort}`);
  console.log(`Skipped action verified: industrial_workers effort is ${rallyEffort.toFixed(2)} (only the 3.6 from media_ad)`);


  console.log('Testing Effort/Reach Accumulation (ratio test)...');
  // Two identical test candidates. Since electionEngine is pure, we can just call buildEngineCandidates
  // and runElection. We don't even need them in the DB.
  const candA = {
    candidateId: 'test-A',
    partyId: 'test-party-A',
    platform: { taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50 },
    credibility: 50,
    isIncumbent: false,
    effortBySegment: { 'industrial_workers': 100, 'civic_professionals': 100 }
  };
  const candB = {
    candidateId: 'test-B',
    partyId: 'test-party-B',
    platform: { taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50 },
    credibility: 50,
    isIncumbent: false,
    effortBySegment: { 'industrial_workers': 200, 'civic_professionals': 200 } // double effort
  };

  const proj = runElection({
    candidates: [candA, candB],
    registeredVoters: 100000
  });

  const shareA = proj.perCandidate.find(c => c.candidateId === 'test-A')?.votes || 0;
  const shareB = proj.perCandidate.find(c => c.candidateId === 'test-B')?.votes || 0;
  
  console.log(`Cand A (effort 100) votes: ${shareA}`);
  console.log(`Cand B (effort 200) votes: ${shareB}`);
  
  const ratio = shareB / shareA;
  console.log(`Ratio CandB/CandA: ${ratio.toFixed(2)}x`);
  assert(ratio > 1.0, `Expected double effort to yield more votes, got ratio ${ratio}`);
  assert(ratio < 2.0, `Expected double effort to yield sub-linear diminishing returns, got ratio ${ratio}`);

  console.log('--- All tests passed! ---');
  process.exit(0);
}

runTest().catch(e => {
  console.error(e);
  process.exit(1);
});
