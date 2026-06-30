import * as assert from 'node:assert';
import { db } from '../src/config/database';
import { ManufacturingController } from '../src/api/controllers/manufacturing.controller';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

async function runTest() {
  const country = await db('countries').where('name', 'Drennia').first();
  if (!country) throw new Error('Drennia not found');
  
  const worldId = country.world_instance_id;
  
  const market = await db('manufacturing_region_markets').where('id', 'drennport-consumer-market').first();
  if (!market) throw new Error('Market not found');

  const userId = Date.now();
  const charId = randomUUID();
  const playerCompanyId = randomUUID();
  const modelId = randomUUID();
  const factoryId = randomUUID();
  const lineId = randomUUID();

  const makeReq = (cId: string) => ({ params: { companyId: cId } } as unknown as Request);
  const makeRes = () => {
    const r: any = {};
    r.status = (c: number) => { r.code = c; return r; };
    r.json = (d: any) => { r.data = d; return r; };
    return r as Response & { data: any, code: number };
  };
  const makeNext = () => ((err?: any) => { if (err) throw err; }) as NextFunction;

  console.log('Setup Competition in Drennia');
  try {
    // Ensure clock exists
    const clockRow = await db('world_clock').first();
    if (!clockRow) await db('world_clock').insert({ current_orbit: 1, current_arc: 1, current_mark: 1, status: 'running' });

    await db('users').insert({ id: userId, email: `test_${Date.now()}@test.com`, password_hash: '123' });
    await db('characters').insert({ id: charId, user_id: userId, world_instance_id: worldId, name: 'Dummy Player', motherland_country_id: country.id, age: 26, created_at_world_orbit: 1, created_at_world_arc: 1, created_at_world_mark: 1 });
    await db('companies').insert({ id: playerCompanyId, world_instance_id: worldId, owner_character_id: charId, industry_id: 'manufacturing', country_id: country.id, headquarters_state_id: 'drennia-drennport', legal_structure_id: 'private-company', currency_id: country.currency_id, name: 'Player Corp 2 ' + Date.now(), status: 'active', created_at_world_orbit: 1, created_at_world_arc: 1, created_at_world_mark: 1 });
    await db('company_finances').insert({ company_id: playerCompanyId, currency_id: country.currency_id, available_cash: 50000000, debt: 0, company_value: 0, last_arc_profit: 0 });

    // RESET Valuecorp
    const valCmpReset = await db('companies').where('name', 'Valuecorp').where('world_instance_id', worldId).first();
    if (valCmpReset) {
       await db('company_finances').where('company_id', valCmpReset.id).update({ available_cash: 1500000 });
       await db('manufacturing_vehicle_models').where('company_id', valCmpReset.id).update({ sale_price: 14500, target_segment: 'Budget' });
       const valInv = await db('manufacturing_inventory').where('company_id', valCmpReset.id).first();
       if (valInv) await db('manufacturing_inventory').where('id', valInv.id).update({ units_in_stock: 0 });
    }

    const comps = ['comp_engine', 'comp_transmission', 'comp_tyres', 'comp_steel', 'comp_glass', 'comp_electronics'];
    for (const c of comps) {
      await db('manufacturing_component_inventory').insert({ company_id: playerCompanyId, component_id: c, units_in_stock: 9999999, world_instance_id: worldId });
    }
    
    // High-priced dummy player initially, then cheap super-competitor
    await db('manufacturing_vehicle_models').insert({
      id: modelId, company_id: playerCompanyId, world_instance_id: worldId, name: 'Player Box', vehicle_class: 'Compact Car',
      platform_type: 'compact_chassis_a', power_unit_type: 'ice_inline_4', drivetrain_type: 'fwd',
      interior_tier: 'standard', safety_tier: 'standard', production_quality: 'standard',
      manufacturing_cost_per_unit: 10000, reliability_score: 95, performance_score: 95, fuel_efficiency_score: 95, appeal_score: 95, cargo_score: 95, safety_score: 95,
      target_segment: 'Budget', sale_price: 100000, development_status: 'launched', dev_stage: 'ready_to_launch', status: 'active',
      created_at_world_orbit: 1, created_at_world_arc: 1, created_at_world_mark: 1
    });
    await db('manufacturing_factories').insert({ id: factoryId, company_id: playerCompanyId, world_instance_id: worldId, country_id: country.id, state_id: 'drennia-drennport', factory_type_id: 'medium-plant', name: 'Player Factory', capacity_per_arc: 500000, lease_cost_per_arc: 10000, maintenance_cost_per_arc: 2000, condition: 100, status: 'active', created_at_world_orbit: 1, created_at_world_arc: 1, created_at_world_mark: 1 });
    await db('manufacturing_production_lines').insert({ id: lineId, factory_id: factoryId, company_id: playerCompanyId, world_instance_id: worldId, assigned_vehicle_model_id: modelId, target_units_per_arc: 300000, status: 'active' });
    const valAlloc = await db('manufacturing_market_allocations')
      .join('companies', 'companies.id', 'manufacturing_market_allocations.company_id')
      .where('companies.name', 'Valuecorp')
      .select('manufacturing_market_allocations.region_market_id')
      .first();
    const targetRegionId = valAlloc ? valAlloc.region_market_id : market.id;

    await db('manufacturing_market_allocations').insert({ company_id: playerCompanyId, vehicle_model_id: modelId, world_instance_id: worldId, region_market_id: targetRegionId, units_allocated: 300000, marketing_tier: 'national' });
    await db('company_staff').insert([
      { company_id: playerCompanyId, role: 'factory-worker', quantity: 2000000 },
      { company_id: playerCompanyId, role: 'production-supervisor', quantity: 10000 },
      { company_id: playerCompanyId, role: 'sales-manager', quantity: 10000 }
    ]);
    const checkStaff = await db('company_staff').where({ company_id: playerCompanyId });
    console.log("Check Staff inserted: ", checkStaff);

    const getIncumbentPrice = async () => {
      const npcs = await db('companies as c')
        .join('manufacturing_vehicle_models as m', 'm.company_id', 'c.id')
        .where('c.name', 'Valuecorp')
        .select('m.sale_price', 'c.id as cid', 'm.id as mid');
      console.log(`Found ${npcs.length} Valuecorp models!`);
      if (npcs.length > 0) {
          console.log(`First Valuecorp model price: ${npcs[0].sale_price}`);
          return Number(npcs[0].sale_price);
      }
      return 0;
    };



    if (valCmpReset) {
      const valLine = await db('manufacturing_production_lines').where('company_id', valCmpReset.id).first();
      if (valLine) {
        const targetAlloc = await db('manufacturing_market_allocations').where({ company_id: valCmpReset.id, region_market_id: targetRegionId }).first();
        if (targetAlloc) {
           await db('manufacturing_market_allocations').where({ id: targetAlloc.id }).update({ units_allocated: 10000 });
        } else {
           await db('manufacturing_market_allocations').insert({
              world_instance_id: worldId, company_id: valCmpReset.id, vehicle_model_id: valLine.assigned_vehicle_model_id,
              region_market_id: targetRegionId, marketing_tier: 'none', units_allocated: 10000
           });
        }
        const existingInv = await db('manufacturing_inventory').where({ company_id: valCmpReset.id, vehicle_model_id: valLine.assigned_vehicle_model_id }).first();
        if (existingInv) {
           await db('manufacturing_inventory').where({ id: existingInv.id }).update({ units_in_stock: 10000 });
        } else {
           await db('manufacturing_inventory').insert({
              world_instance_id: worldId, company_id: valCmpReset.id, vehicle_model_id: valLine.assigned_vehicle_model_id,
              units_in_stock: 10000, inventory_value: 0, storage_cost_per_arc: 0
           });
        }
      }
    }

    // Run 3 arcs
    for (let i = 1; i <= 3; i++) {
      let orbit = Math.floor((i - 1) / 8) + 1;
      let arc = ((i - 1) % 8) + 1;
      await db('world_clock').update({ current_orbit: orbit, current_arc: arc });
      await db('manufacturing_arc_reports').where({ world_orbit: orbit, world_arc: arc }).del();
      await db('manufacturing_sales_results').where({ world_orbit: orbit, world_arc: arc }).del();
      await db('manufacturing_model_snapshots').where({ world_orbit: orbit, world_arc: arc }).del();
      
      const reqPlayer = makeReq(playerCompanyId);
      const resPlayer = makeRes();
      await ManufacturingController.processManufacturingArc(reqPlayer, resPlayer, makeNext());
    }

    const priceBefore = await getIncumbentPrice();
    console.log(`Incumbent Price Before Competitor: ${priceBefore}`);

    // Print market share of Valuecorp before
    const valBefore = await db('manufacturing_npc_state').join('companies', 'companies.id', 'manufacturing_npc_state.company_id').where('companies.name', 'Valuecorp').where('companies.world_instance_id', worldId).first();
    console.log(`Valuecorp Market Share Before: ${valBefore?.last_market_share}, Sold: ${valBefore?.last_units_sold}`);

    // Inject Competitor (Price it well below Valuecorp)
    console.log('Injecting Competitor to undercut Valuecorp (Budget Segment)');
    await db('manufacturing_vehicle_models').where({ id: modelId }).update({ sale_price: 10000, target_segment: 'Budget' });
    await db('manufacturing_production_lines').where({ id: lineId }).update({ target_units_per_arc: 300000 });
    await db('manufacturing_market_allocations').where({ company_id: playerCompanyId, vehicle_model_id: modelId }).update({ units_allocated: 300000, marketing_tier: 'national' });
    
    // Give Dummy perfect brand awareness and reputation in Drennia so it absorbs maximum raw interest
    const existingBrand = await db('manufacturing_brand_awareness').where({ company_id: playerCompanyId, region_market_id: targetRegionId }).first();
    if (existingBrand) {
        await db('manufacturing_brand_awareness').where({ id: existingBrand.id }).update({ awareness: 100, reputation: 100 });
    } else {
        await db('manufacturing_brand_awareness').insert({
            company_id: playerCompanyId,
            region_market_id: targetRegionId,
            awareness: 100,
            reputation: 100
        });
    }

    // Isolate Valuecorp to only the target region so the competitor has a global effect on its stats
    const valCmpSetup = await db('companies').where('name', 'Valuecorp').where('world_instance_id', worldId).first();
    const valLine = await db('manufacturing_production_lines').where('company_id', valCmpSetup.id).first();
    if (valLine) {
       await db('manufacturing_production_lines').where('id', valLine.id).update({ target_units_per_arc: 100 });
    }
    const allAllocs = await db('manufacturing_market_allocations').where({ company_id: valCmpSetup.id });
    
    // Restore the market to realistic Drennia numbers (approx 2M pop)
    await db('manufacturing_region_markets').where({ id: targetRegionId }).update({
      baseline_replacement_rate: 0.05,
      first_time_buyer_rate: 0.05,
      population: 2100000
    });

    let finalOrbit = 1;
    // Run 2 more arcs
    for (let i = 4; i <= 5; i++) {
      let orbit = Math.floor((i - 1) / 8) + 1;
      let arc = ((i - 1) % 8) + 1;
      finalOrbit = orbit;
      await db('world_clock').update({ current_orbit: orbit, current_arc: arc });
      await db('manufacturing_arc_reports').where({ world_orbit: orbit, world_arc: arc }).del();
      await db('manufacturing_sales_results').where({ world_orbit: orbit, world_arc: arc }).del();
      await db('manufacturing_model_snapshots').where({ world_orbit: orbit, world_arc: arc }).del();
      
      const req = makeReq(playerCompanyId);
      const res = makeRes();
      await ManufacturingController.processManufacturingArc(req, res, makeNext());
    }

    const priceAfter = await getIncumbentPrice();
    console.log(`Incumbent Price After Competitor: ${priceAfter}`);

    // Print market share of Valuecorp after
    const valAfter = await db('manufacturing_npc_state').join('companies', 'companies.id', 'manufacturing_npc_state.company_id').where('companies.name', 'Valuecorp').where('companies.world_instance_id', worldId).first();
    console.log(`Valuecorp Market Share After: ${valAfter?.last_market_share}, Sold: ${valAfter?.last_units_sold}`);

    // Print market share of dummy player after
    const dummySales = await db('manufacturing_sales_results').where('company_id', playerCompanyId).orderBy('world_arc', 'desc').first();
    console.log(`Dummy Market Share After: ${dummySales?.market_share_estimate}, Sold: ${dummySales?.units_sold}, Reason: ${dummySales?.main_reason_code}`);
    
    const dummyAlloc = await db('manufacturing_market_allocations').where({ company_id: playerCompanyId }).first();
    const dummyModel = await db('manufacturing_vehicle_models').where({ company_id: playerCompanyId }).first();
    console.log(`Dummy Inventory: ${dummySales?.inventory_in_stock}, Alloc: ${dummyAlloc?.units_allocated}, Price: ${dummyModel?.sale_price}`);

    const ratio = priceAfter / priceBefore;
    console.log(`Reactivity Ratio: ${ratio.toFixed(2)}`);
    const dummySalesArc = await db('manufacturing_sales_results').where({ company_id: playerCompanyId, world_orbit: finalOrbit }).whereIn('world_arc', [4, 5]);
    console.log("Dummy Sales in Arc 4 and 5:", dummySalesArc.map(s => ({ arc: s.world_arc, sold: s.units_sold, share: s.market_share_estimate })));
    const valCmp = await db('companies').where('name', 'Valuecorp').where('world_instance_id', worldId).first();
    const valSales = await db('manufacturing_sales_results').where({ company_id: valCmp.id, world_orbit: finalOrbit }).whereIn('world_arc', [4, 5]);
    console.log("Valuecorp Sales in Arc 4 and 5:", valSales.map(s => ({ arc: s.world_arc, sold: s.units_sold, share: s.market_share_estimate })));
    
    assert.ok(ratio < 1.0, `Incumbent failed to cut price! Ratio: ${ratio.toFixed(2)}`);

    console.log('Reactivity Scenario Passed');
  } catch (err) {
    console.error('TEST CRASHED WITH ERROR:', err);
    throw err;
  } finally {
    // Cleanup player
    await db('manufacturing_market_allocations').where({ company_id: playerCompanyId }).del();
    await db('manufacturing_production_lines').where({ company_id: playerCompanyId }).del();
    await db('manufacturing_factories').where({ company_id: playerCompanyId }).del();
    await db('manufacturing_vehicle_models').where({ company_id: playerCompanyId }).del();
    await db('company_finances').where({ company_id: playerCompanyId }).del();
    await db('companies').where({ id: playerCompanyId }).del();
    await db('characters').where({ id: charId }).del();
    await db('users').where({ id: userId }).del();
    await db.destroy();
  }
}

runTest().catch(console.error);
