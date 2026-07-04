import assert from 'assert';
import { db } from '../src/config/database';
import { processPoliticalArc } from '../src/api/services/politics.service';
import crypto from 'crypto';

async function runTest() {
  console.log('--- Starting Politics P5B (Tenders) Tests ---');

  const state = await db('pol_states').where({ code: 'ironvale' }).first();
  const cycle = await db('pol_cycles').where({ state_id: state.id, status: 'open' }).first();

  const parties = await db('pol_parties').select('id');
  const governingPartyId = parties[0].id;
  
  // Set to governing phase
  const governingArc = cycle.polling_arc + 3;
  await db('world_clock').update({ current_month: governingArc });
  await db('pol_cycles').where({ id: cycle.id }).update({ phase: 'governing' });

  // 1. Create a Tender directly in DB to simulate postTender
  const [tender] = await db('pol_tenders').insert({
    state_id: state.id,
    vehicle_class: 'compact',
    spec_floor: JSON.stringify({ reliability_score: 50, safety_score: 50 }),
    units_per_arc: 10,
    max_price: 15000,
    duration_arcs: 2,
    status: 'open',
    posted_arc: governingArc
  }).returning('*');

  console.log('Tender posted:', tender.id);

  // 2. Setup mock company and model
  const companyObj = await db('companies').first();
  
  const [model] = await db('manufacturing_vehicle_models').insert({
    id: crypto.randomUUID(),
    world_instance_id: companyObj.world_instance_id,
    company_id: companyObj.id,
    platform_type: 'hatchback',
    power_unit_type: 'ice_inline4',
    drivetrain_type: 'fwd',
    vehicle_class: 'compact',
    target_segment: 'suburban_families',
    interior_tier: 'basic',
    safety_tier: 'basic',
    name: 'Tender Car',
    status: 'active',
    sale_price: 10000,
    manufacturing_cost_per_unit: 8000,
    reliability_score: 60,
    performance_score: 50,
    fuel_efficiency_score: 50,
    appeal_score: 50,
    cargo_score: 50,
    safety_score: 60,
    created_at_world_year: 1,
    created_at_world_month: 1,
    created_at_world_day: 1
  }).returning('*');

  // Insert inventory: exactly 5 units (less than the 10 units_per_arc requested) to test clamp
  const [invRecord] = await db('manufacturing_inventory').insert({
    world_instance_id: companyObj.world_instance_id,
    company_id: companyObj.id,
    vehicle_model_id: model.id,
    units_in_stock: 5
  }).returning('*');

  // 3. Bid on Tender
  const [bid] = await db('pol_tender_bids').insert({
    tender_id: tender.id,
    company_id: companyObj.id,
    model_id: model.id,
    bid_price: 12000,
    created_arc: governingArc
  }).returning('*');

  console.log('Bid placed:', bid.id);

  // Check finances before settlement
  const preFinance = await db('company_finances').where({ company_id: companyObj.id }).first();
  const initialCash = Number(preFinance.available_cash);

  // 4. Process month N+1 to award the tender
  await db('world_clock').update({ current_month: governingArc + 1 });
  await processPoliticalArc(db, state.id, governingArc + 1);

  const awardedTender = await db('pol_tenders').where({ id: tender.id }).first();
  assert.strictEqual(awardedTender.status, 'active', 'Tender should be active after award');
  assert.strictEqual(awardedTender.awarded_company_id, companyObj.id, 'Tender should be awarded to the company');
  assert.strictEqual(Number(awardedTender.awarded_price), 12000, 'Awarded price should match bid');

  console.log('Tender awarded correctly.');

  // 5. Settlement happens in the same month (N+1) since it's now active
  // Wait, in processPoliticalArc, awardTenders happens before settleTenders. 
  // So it got awarded AND settled on month N+1.
  const postFinance = await db('company_finances').where({ company_id: companyObj.id }).first();
  const postCash = Number(postFinance.available_cash);

  const postInv = await db('manufacturing_inventory').where({ id: invRecord.id }).first();

  assert.strictEqual(postCash, initialCash + (5 * 12000), 'Cash should increase by units * price (5 * 12000 = 60000)');
  assert.strictEqual(Number(postInv.units_in_stock), 0, 'Inventory should clamp to 5 and leave 0');

  console.log('Tender settlement 1 correctly clamped and settled.');

  // 6. Month N+2 (Second settlement)
  await db('world_clock').update({ current_month: governingArc + 2 });
  // Add 10 more inventory
  await db('manufacturing_inventory').where({ id: invRecord.id }).update({ units_in_stock: 10 });
  await processPoliticalArc(db, state.id, governingArc + 2);

  const postFinance2 = await db('company_finances').where({ company_id: companyObj.id }).first();
  const postCash2 = Number(postFinance2.available_cash);
  const postInv2 = await db('manufacturing_inventory').where({ id: invRecord.id }).first();

  assert.strictEqual(postCash2, postCash + (10 * 12000), 'Cash should increase by 10 * 12000');
  assert.strictEqual(Number(postInv2.units_in_stock), 0, 'Inventory should be depleted fully');

  console.log('Tender settlement 2 correctly settled.');

  const closedTender = await db('pol_tenders').where({ id: tender.id }).first();
  assert.strictEqual(closedTender.status, 'closed', 'Tender should close after duration_arcs elapses');

  console.log('--- All P5B tests passed! ---');
  process.exit(0);
}

runTest().catch(e => {
  console.error(e);
  process.exit(1);
});
