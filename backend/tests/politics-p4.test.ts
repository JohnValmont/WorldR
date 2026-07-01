import { db } from '../src/config/database';
import { processPoliticalArc, getOrCreateCurrentCycle } from '../src/api/services/politics.service';
import { POL_COUNCIL_SEATS, POL_MAJORITY_SEATS, POL_FORMATION_WINDOW_ARCS, POL_TERM_LENGTH_ARCS } from '../src/api/constants/politics';
import assert from 'assert';

async function runTest() {
  console.log('--- Starting Politics P4 Tests ---');

  // Clean test state
  await db('pol_campaign_actions').del();
  await db('pol_results').del();
  await db('pol_coalitions').del();
  await db('pol_council_seats').del();
  await db('pol_ledger_events').del();
  await db('pol_cycles').del();

  const state = await db('pol_states').where({ is_active: true }).first();
  if (!state) throw new Error('No active state');

  const cycle = await getOrCreateCurrentCycle(state.id);
  const pollingArc = cycle.polling_arc;
  const oldCycleId = cycle.id;
  const oldFormationArc = cycle.formation_end_arc;

  console.log('Testing Election Resolution...');
  // Trigger filing to ensure NPC candidates are created
  const filingArc = cycle.polling_arc - 8; // filing phase is -9 to -6
  await processPoliticalArc(db, state.id, filingArc);

  // Trigger campaign to ensure NPC brain runs at least once
  const campaignArc = cycle.polling_arc - 5;
  await processPoliticalArc(db, state.id, campaignArc);

  // process polling arc
  await processPoliticalArc(db, state.id, pollingArc);

  const updatedCycle = await db('pol_cycles').where({ id: oldCycleId }).first();
  assert.strictEqual(updatedCycle.phase, 'formation', 'Phase should be formation');

  const seats = await db('pol_council_seats').where({ cycle_id: oldCycleId });
  assert.strictEqual(seats.length, POL_COUNCIL_SEATS, `Expected exactly ${POL_COUNCIL_SEATS} seats, got ${seats.length}`);
  console.log(`Allocated exactly ${POL_COUNCIL_SEATS} seats.`);

  const seatCounts: Record<string, number> = {};
  for (const s of seats) {
    seatCounts[s.party_id] = (seatCounts[s.party_id] || 0) + 1;
  }
  for (const [partyId, count] of Object.entries(seatCounts)) {
    const p = await db('pol_parties').where({ id: partyId }).first();
    console.log(`Party ${p.name} won ${count} seats.`);
  }

  const results = await db('pol_results').where({ cycle_id: oldCycleId });
  assert(results.length > 0, 'No results recorded');

  // Verify Idempotency for Polling
  console.log('Testing Idempotency for Election Resolution...');
  await processPoliticalArc(db, state.id, pollingArc);
  const seatsAgain = await db('pol_council_seats').where({ cycle_id: oldCycleId });
  assert.strictEqual(seatsAgain.length, POL_COUNCIL_SEATS, 'Polling idempotency failed, duplicate seats allocated');

  // Fast forward to formation end arc to resolve formation automatically (since NPC logic handles auto-coalition)
  console.log('Testing Government Formation...');
  await processPoliticalArc(db, state.id, oldFormationArc);

  const coalition = await db('pol_coalitions').where({ cycle_id: oldCycleId }).first();
  assert(coalition, 'No coalition or minority gov recorded');
  
  const leadParty = await db('pol_parties').where({ id: coalition.lead_party_id }).first();
  if (coalition.status === 'formed' && coalition.total_seats >= POL_MAJORITY_SEATS) {
    console.log(`Government Formed: ${leadParty.name} leads with ${coalition.total_seats} seats (Status: ${coalition.status}).`);
  } else if (coalition.status === 'minority') {
    console.log(`Minority Government: ${leadParty.name} leads with ${coalition.total_seats} seats (Status: ${coalition.status}).`);
  } else {
    assert.fail(`Invalid coalition state: ${coalition.status} with ${coalition.total_seats} seats`);
  }

  const office = await db('pol_offices').where({ state_id: state.id, office: 'premier' }).orderBy('since_arc', 'desc').first();
  assert(office, 'Premier office not assigned');
  const premierParty = await db('pol_parties').where({ id: office.party_id }).first();
  console.log(`Premier named from party: ${premierParty.name}.`);
  assert.strictEqual(office.party_id, coalition.lead_party_id, 'Premier party must be the lead party of the coalition');

  // Verify Idempotency for Formation
  console.log('Testing Idempotency for Government Formation...');
  await processPoliticalArc(db, state.id, oldFormationArc);
  const coalitionsAgain = await db('pol_coalitions').where({ cycle_id: oldCycleId });
  assert.strictEqual(coalitionsAgain.length, 1, 'Formation idempotency failed, duplicate coalitions recorded');

  // Verify Cycle Rollover
  console.log('Testing Cycle Rollover...');
  const closedCycle = await db('pol_cycles').where({ id: oldCycleId }).first();
  assert.strictEqual(closedCycle.status, 'closed', 'Old cycle should be closed');

  const newCycle = await db('pol_cycles').where({ state_id: state.id, status: 'open' }).first();
  assert(newCycle, 'No new open cycle created');
  assert.strictEqual(newCycle.cycle_number, closedCycle.cycle_number + 1, 'Cycle number should increment');
  assert.strictEqual(newCycle.polling_arc, newCycle.start_arc + POL_TERM_LENGTH_ARCS, 'New polling arc should be start_arc + 48');
  assert.strictEqual(newCycle.formation_end_arc, newCycle.polling_arc + POL_FORMATION_WINDOW_ARCS, 'New formation end should be polling_arc + 2');
  console.log(`Cycle rolled over to cycle_number ${newCycle.cycle_number}, polling at arc ${newCycle.polling_arc}.`);

  // Verify Ledger Events
  const events = await db('pol_ledger_events')
    .where('arc', pollingArc)
    .orWhere('arc', oldFormationArc);
  let hasResultEvent = false;
  let hasFormationEvent = false;
  for (const e of events) {
    if (e.kind === 'election_results') hasResultEvent = true;
    if (e.kind === 'government_formed') hasFormationEvent = true;
    console.log(`[LEDGER] ${e.headline}: ${e.body}`);
  }
  assert(hasResultEvent, 'Missing election_results ledger event');
  assert(hasFormationEvent, 'Missing government_formed ledger event');

  console.log('--- All tests passed! ---');
  process.exit(0);
}

runTest().catch(e => {
  console.error(e);
  process.exit(1);
});
