import { db } from './src/config/database';

async function cleanup() {
  console.log('Cleaning up database...');

  await db('manufacturing_model_snapshots').del();
  await db('manufacturing_sales_results').del();
  await db('manufacturing_inventory').del();
  await db('manufacturing_arc_reports').del();
  await db('manufacturing_npc_state').del();
  
  const npcs = await db('companies').where('is_npc', true).orderBy('created_at', 'desc');
  const keptTypes = new Set();
  const keepIds = [];
  
  for (const npc of npcs) {
    if (!keptTypes.has(npc.name)) {
      keptTypes.add(npc.name);
      keepIds.push(npc.id);
    }
  }
  
  const deleteIds = npcs.map(n => n.id).filter(id => !keepIds.includes(id));
  if (deleteIds.length > 0) {
    await db('manufacturing_market_allocations').whereIn('company_id', deleteIds).del();
    await db('manufacturing_production_lines').whereIn('company_id', deleteIds).del();
    await db('manufacturing_factories').whereIn('company_id', deleteIds).del();
    await db('manufacturing_vehicle_models').whereIn('company_id', deleteIds).del();
    await db('company_staff').whereIn('company_id', deleteIds).del();
    await db('company_finances').whereIn('company_id', deleteIds).del();
    await db('companies').whereIn('id', deleteIds).del();
  }
  
  const players = await db('companies').where('name', 'like', 'Player Corp 2%');
  if (players.length > 0) {
     const pIds = players.map(p => p.id);
     await db('manufacturing_market_allocations').whereIn('company_id', pIds).del();
     await db('manufacturing_production_lines').whereIn('company_id', pIds).del();
     await db('manufacturing_factories').whereIn('company_id', pIds).del();
     await db('manufacturing_vehicle_models').whereIn('company_id', pIds).del();
     await db('company_staff').whereIn('company_id', pIds).del();
     await db('company_finances').whereIn('company_id', pIds).del();
     await db('companies').whereIn('id', pIds).del();
  }

  for (const id of keepIds) {
    const npc = npcs.find(n => n.id === id);
    let target = 0;
    let cash = 0;
    let price = 0;
    if (npc.name === 'Apex Automobili') { target = 40; cash = 2000000; price = 58000; }
    if (npc.name === 'Valuecorp') { target = 100; cash = 1500000; price = 14500; }
    if (npc.name === 'HaulPro') { target = 80; cash = 2500000; price = 34000; }
    if (npc.name === 'Veridian Motors') { target = 90; cash = 2500000; price = 27000; }
    
    await db('manufacturing_production_lines').where('company_id', id).update({ target_units_per_arc: target });
    await db('company_finances').where('company_id', id).update({ available_cash: cash });
    await db('manufacturing_vehicle_models').where('company_id', id).update({ sale_price: price });
    await db('manufacturing_market_allocations').where('company_id', id).update({ units_allocated: target });
  }

  console.log('Cleanup complete.');
  process.exit(0);
}

cleanup().catch(console.error);
