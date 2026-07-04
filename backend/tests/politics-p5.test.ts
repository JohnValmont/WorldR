import { db } from '../src/config/database';
import { processPoliticalArc, getOrCreateCurrentCycle } from '../src/api/services/politics.service';
import assert from 'assert';

async function runTest() {
  console.log('--- Starting Politics P5A Tests ---');

  // Clean test state
  await db('pol_bills').del();
  await db('pol_bill_votes').del();
  await db('pol_state_policy').del();
  await db('pol_ledger_events').del();
  await db('company_ledger').del();

  const state = await db('pol_states').where({ is_active: true }).first();
  if (!state) throw new Error('No active state');

  let cycle = await getOrCreateCurrentCycle(state.id);

  // Form government so seats exist if they dont (run election)
  await processPoliticalArc(db, state.id, cycle.polling_arc);
  await processPoliticalArc(db, state.id, cycle.formation_end_arc);

  // Fast forward to governing phase
  cycle = await getOrCreateCurrentCycle(state.id);
  const governingArc = cycle.start_arc + 5;
  await db('pol_cycles').where({ id: cycle.id }).update({ phase: 'governing' });
  cycle.phase = 'governing';

  // Mock seats directly for the governing cycle test since cycle rollover logic is complex to test here
  const parties = await db('pol_parties').where({ state_id: state.id });
  await db('pol_council_seats').where({ cycle_id: cycle.id }).del();
  const crypto = require('crypto');
  const seatsToInsert = Array.from({length: 61}).map(() => ({
    id: crypto.randomUUID(),
    cycle_id: cycle.id,
    state_id: state.id,
    party_id: parties[0].id,
    is_npc: true,
    character_id: null
  }));
  await db('pol_council_seats').insert(seatsToInsert);

  // Find the actual governing party, mock coalition if needed
  let coalition = await db('pol_coalitions').where({ cycle_id: cycle.id }).whereIn('status', ['formed', 'minority']).first();
  if(!coalition) {
    await db('pol_coalitions').insert({
      cycle_id: cycle.id,
      lead_party_id: parties[0].id,
      member_party_ids: JSON.stringify({ invited: [], accepted: [] }),
      total_seats: 61,
      status: 'formed'
    });
    coalition = await db('pol_coalitions').where({ cycle_id: cycle.id }).first();
  }
  const governingPartyId = coalition ? coalition.lead_party_id : parties[0].id;

  console.log('Testing Proposing and Passing a Bill (Industry Tax)...');
  
  // 1. Insert a bill
  const [bill] = await db('pol_bills').insert({
    state_id: state.id,
    proposed_by_party_id: governingPartyId,
    type: 'industry_tax',
    params: JSON.stringify({ rate: 0.15 }),
    status: 'proposed',
    proposed_arc: governingArc - 1
  }).returning('*');

  // 2. Resolve bills via processPoliticalArc
  await processPoliticalArc(db, state.id, governingArc);

  // 3. Verify bill passed
  const updatedBill = await db('pol_bills').where({ id: bill.id }).first();
  assert.strictEqual(updatedBill.status, 'passed', 'Bill should be passed by auto-NPC voting');

  // 4. Verify policy updated
  const policy = await db('pol_state_policy').where({ state_id: state.id }).first();
  assert(policy, 'Policy should be created/updated');
  assert.strictEqual(Number(policy.industry_tax_rate), 0.15, 'Tax rate should be updated to 0.15');

  // 5. Verify ledger event
  const events = await db('pol_ledger_events').where({ month: governingArc, kind: 'bill_passed' });
  assert.strictEqual(events.length, 1, 'Should emit exactly one bill_passed event');

  // Set tax to 20%
  await db('pol_state_policy').where({ state_id: state.id }).update({ industry_tax_rate: 0.20 });

  // 6. Test 20% tax application via settleForCompany
  const { settleForCompany } = require('../src/api/controllers/manufacturing.controller');
  
  const companyObj = await db('companies').first();
  const compId = companyObj.id;
  
  await db('company_finances').where({ company_id: compId }).update({
    available_cash: 100000,
    debt: 0,
    company_value: 100000,
    last_arc_profit: 0
  });

  // Create a mock state object to pass to settleForCompany
  const mockPState = {
    runningCash: 100000,
    totalGrossRevenue: 50000,
    totalProductionCosts: 10000,
    totalStaffWages: 0,
    totalLeaseCosts: 0,
    totalMaintenanceCosts: 0,
    totalStorageCosts: 0,
    totalUnitsProduced: 0,
    modelTracking: new Map()
  };
  
  // Profit = 50000 - 10000 = 40000. 20% tax = 8000. runningCash should become 100000 - 8000 = 92000.
  const dummyModels = new Map();
  const dummyAllocations = new Map();
  
  // Actually, settleForCompany does DB calls inside, so we just call it and it will compute tax.
  // Wait, settleForCompany is not easily mockable without full setup. Let me just test the tax logic by isolating it or providing exactly what it expects.
  // Instead, I'll run the exact logic or mock the minimum viable inputs.
  // Let's look at settleForCompany signature: settleForCompany(trx, company, pState, models, allocations, currentYear, currentMonth, currentDay)
  
  await db.transaction(async (trx) => {
    await settleForCompany(trx, companyObj, mockPState, dummyModels, dummyAllocations, 1, 1, 1);
  });
  
  assert.strictEqual(mockPState.runningCash, 92000, 'Tax should deduct exactly 20% of net profit (8000)');

  // Test loss-making
  const mockLossState = {
    runningCash: 100000,
    totalGrossRevenue: 10000,
    totalProductionCosts: 50000,
    totalStaffWages: 0,
    totalLeaseCosts: 0,
    totalMaintenanceCosts: 0,
    totalStorageCosts: 0,
    totalUnitsProduced: 0,
    modelTracking: new Map()
  };
  await db.transaction(async (trx) => {
    await settleForCompany(trx, companyObj, mockLossState, dummyModels, dummyAllocations, 1, 1, 1);
  });
  assert.strictEqual(mockLossState.runningCash, 100000, 'Loss-making company should be untaxed');

  console.log('Testing zero-tax idempotency rule (No state mutation if tax = 0)...');
  await db('pol_state_policy').where({ state_id: state.id }).update({ industry_tax_rate: 0 });
  const mockZeroTaxState = {
    runningCash: 100000,
    totalGrossRevenue: 50000,
    totalProductionCosts: 10000,
    totalStaffWages: 0,
    totalLeaseCosts: 0,
    totalMaintenanceCosts: 0,
    totalStorageCosts: 0,
    totalUnitsProduced: 0,
    modelTracking: new Map()
  };
  await db.transaction(async (trx) => {
    await settleForCompany(trx, companyObj, mockZeroTaxState, dummyModels, dummyAllocations, 1, 1, 1);
  });
  assert.strictEqual(mockZeroTaxState.runningCash, 100000, '0% tax should deduct nothing');

  // Test minority gov tiebreaker logic
  console.log('Testing Minority Government Tie-Breaker (Tie fails)...');
  const [tieBill] = await db('pol_bills').insert({
    state_id: state.id,
    proposed_by_party_id: governingPartyId,
    type: 'industry_tax',
    params: JSON.stringify({ rate: 0.25 }),
    status: 'proposed',
    proposed_arc: governingArc - 1
  }).returning('*');

  // We need to manipulate seats so it's exactly 30 vs 30 vs 1 (abstain or independent not voting)
  await db('pol_council_seats').where({ cycle_id: cycle.id }).del();
  const tieSeats = Array.from({length: 60}).map((_, i) => ({
    id: crypto.randomUUID(),
    cycle_id: cycle.id,
    state_id: state.id,
    party_id: i < 30 ? parties[0].id : parties[1].id,
    is_npc: true,
    character_id: null
  }));
  // Insert exactly 30 seats for party 0 and 30 for party 1
  await db('pol_council_seats').insert(tieSeats);
  
  // Set coalition to minority with just party 0 (30 seats)
  await db('pol_coalitions').where({ cycle_id: cycle.id }).update({ status: 'minority', lead_party_id: parties[0].id, member_party_ids: JSON.stringify({ invited: [], accepted: [] }) });
  
  await processPoliticalArc(db, state.id, governingArc);
  
  const updatedTieBill = await db('pol_bills').where({ id: tieBill.id }).first();
  assert.strictEqual(updatedTieBill.status, 'failed', 'A tied bill (30 yea vs 30 nay) must NOT pass');

  console.log('--- All P5A tests passed! ---');
  process.exit(0);
}

runTest().catch(e => {
  console.error(e);
  process.exit(1);
});