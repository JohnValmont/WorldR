import assert from 'assert';
import { db } from '../src/config/database';
import { processPoliticalArc } from '../src/api/services/politics.service';
import crypto from 'crypto';
import { POL_FACTOR_DELTAS } from '../src/api/constants/politics';

async function runTest() {
  console.log('--- Starting Politics E2E Factor Feedback Test ---');

  // 1. Setup Data
  const state = await db('pol_states').where({ code: 'ironvale' }).first();
  await db('pol_cycles').delete();
  await db('pol_parties').delete();
  await db('pol_party_members').delete();
  await db('pol_candidates').delete();
  await db('pol_council_seats').delete();
  await db('pol_tenders').delete();
  await db('pol_bills').delete();
  await db('pol_results').delete();
  
  // Grab existing company and owner
  const companyObj = await db('companies').first();
  const charId = companyObj.owner_character_id;
  const companyId = companyObj.id;

  // Make sure character has factors for assertion baseline
  await db('characters').where({ id: charId }).update({
    influence: 10,
    credibility: 10,
    charisma: 10
  });

  // Setup cycle
  const currentMonth = 100;
  await db('world_clock').update({ current_month: currentMonth });
  
  const cycleId = crypto.randomUUID();
  await db('pol_cycles').insert({
    id: cycleId,
    state_id: state.id,
    cycle_number: 1,
    phase: 'campaign',
    start_arc: currentMonth - 20,
    polling_arc: currentMonth + 5,
    formation_end_arc: currentMonth + 7,
    status: 'open'
  });

  // Create party
  const partyId = crypto.randomUUID();
  await db('pol_parties').insert({
    id: partyId,
    state_id: state.id,
    name: 'Player Party',
    leader_character_id: charId,
    platform: JSON.stringify({ taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50 }),
    treasury: 100000,
    is_npc: false,
    created_arc: currentMonth
  });

  await db('pol_party_members').insert({
    party_id: partyId,
    character_id: charId,
    role: 'leader',
    joined_arc: currentMonth
  });

  // Create candidate
  const candId = crypto.randomUUID();
  await db('pol_candidates').insert({
    id: candId,
    cycle_id: cycleId,
    party_id: partyId,
    character_id: charId,
    is_npc: false,
    platform: JSON.stringify({ taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50 }),
    is_incumbent: false
  });

  // 2. Queue 3 campaign actions to trigger ACTIVE_CAMPAIGN at rollover
  for (let i = 0; i < 3; i++) {
    await db('pol_campaign_actions').insert({
      cycle_id: cycleId,
      candidate_id: candId,
      action_type: 'rally',
      target_segment: 'suburban_families',
      cash_spent: 5000,
      effort: 20,
      resolved_arc: currentMonth
    });
  }

  // Helper to fetch character factors
  const getFactors = async () => {
    const char = await db('characters').where({ id: charId }).first();
    return { inf: Number(char.influence), cred: Number(char.credibility), char: Number(char.charisma) };
  };

  const initial = await getFactors();
  assert.deepStrictEqual(initial, { inf: 10, cred: 10, char: 10 });

  // 3. Resolve Election (polling month)
  await processPoliticalArc(db, state.id, currentMonth + 5);

  const postElection = await getFactors();
  // Should have won seat (player is the only candidate)
  // WIN_SEAT = influence + 6, credibility + 3
  assert.strictEqual(postElection.inf, 10 + POL_FACTOR_DELTAS.WIN_SEAT.influence, 'Influence after WIN_SEAT');
  assert.strictEqual(postElection.cred, 10 + POL_FACTOR_DELTAS.WIN_SEAT.credibility, 'Credibility after WIN_SEAT');

  // Idempotency check: Re-process the same month
  await processPoliticalArc(db, state.id, currentMonth + 5);
  const postElectionIdempotent = await getFactors();
  assert.deepStrictEqual(postElectionIdempotent, postElection, 'WIN_SEAT must be idempotent');

  // 4. Form Government & Name Premier (formation_end_arc)
  await processPoliticalArc(db, state.id, currentMonth + 7);
  
  const postFormation = await getFactors();
  // Should become premier (BECOME_PREMIER = inf+12, cred+6, char+3)
  assert.strictEqual(postFormation.inf, postElection.inf + POL_FACTOR_DELTAS.BECOME_PREMIER.influence, 'Influence after Premier');
  assert.strictEqual(postFormation.cred, postElection.cred + POL_FACTOR_DELTAS.BECOME_PREMIER.credibility, 'Credibility after Premier');
  assert.strictEqual(postFormation.char, initial.char + POL_FACTOR_DELTAS.BECOME_PREMIER.charisma + POL_FACTOR_DELTAS.ACTIVE_CAMPAIGN.charisma, 'Charisma includes active campaign bonus');

  // Idempotency check:
  await processPoliticalArc(db, state.id, currentMonth + 7);
  const postFormationIdempotent = await getFactors();
  assert.deepStrictEqual(postFormationIdempotent, postFormation, 'Premier & Rollover must be idempotent');

  // 5. Propose and Pass Bill (in new cycle, governing phase)
  const billId = crypto.randomUUID();
  await db('pol_bills').insert({
    id: billId,
    state_id: state.id,
    proposed_by_party_id: partyId, // Player party
    type: 'industry_tax',
    params: JSON.stringify({ rate: 0.15 }),
    status: 'proposed',
    proposed_arc: currentMonth + 8
  });

  // Vote YEA
  await db('pol_bill_votes').insert({
    bill_id: billId,
    character_id: charId,
    vote: 'yea'
  });

  await processPoliticalArc(db, state.id, currentMonth + 9);
  
  const postBill = await getFactors();
  // BILL_PASSES = cred+4
  assert.strictEqual(postBill.cred, postFormation.cred + POL_FACTOR_DELTAS.BILL_PASSES.credibility, 'Credibility after Bill passes');

  // Idempotency check:
  await processPoliticalArc(db, state.id, currentMonth + 9);
  const postBillIdempotent = await getFactors();
  assert.deepStrictEqual(postBillIdempotent, postBill, 'BILL_PASSES must be idempotent');

  // 6. Tender Wins
  const tenderId = crypto.randomUUID();
  await db('pol_tenders').insert({
    id: tenderId,
    state_id: state.id,
    vehicle_class: 'compact',
    spec_floor: JSON.stringify({}),
    units_per_month: 5,
    max_price: 20000,
    duration_arcs: 1,
    status: 'open',
    posted_arc: currentMonth + 9
  });

  const modelId = crypto.randomUUID();
  await db('manufacturing_vehicle_models').insert({
    id: modelId,
    world_instance_id: companyObj.world_instance_id,
    company_id: companyId,
    platform_type: 'hatchback',
    power_unit_type: 'ice_inline4',
    drivetrain_type: 'fwd',
    vehicle_class: 'compact',
    target_segment: 'suburban_families',
    interior_tier: 'basic',
    safety_tier: 'basic',
    name: 'Car',
    status: 'active',
    sale_price: 15000,
    manufacturing_cost_per_unit: 10000,
    reliability_score: 50,
    performance_score: 50,
    fuel_efficiency_score: 50,
    appeal_score: 50,
    cargo_score: 50,
    safety_score: 50,
    created_at_world_year: 1,
    created_at_world_month: 1,
    created_at_world_day: 1
  });

  await db('pol_tender_bids').insert({
    tender_id: tenderId,
    company_id: companyId,
    model_id: modelId,
    bid_price: 15000,
    created_arc: currentMonth + 9
  });

  await processPoliticalArc(db, state.id, currentMonth + 10);

  const postTender = await getFactors();
  // TENDER_WINS = cred+4
  assert.strictEqual(postTender.cred, postBill.cred + POL_FACTOR_DELTAS.TENDER_WINS.credibility, 'Credibility after Tender wins');

  await processPoliticalArc(db, state.id, currentMonth + 10);
  const postTenderIdempotent = await getFactors();
  assert.deepStrictEqual(postTenderIdempotent, postTender, 'TENDER_WINS must be idempotent');

  console.log('--- All E2E Factor Feedback tests passed successfully! ---');
  process.exit(0);
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
