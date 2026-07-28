import { Client } from 'pg';

const PROD_DB = 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function main() {
  const client = new Client(PROD_DB);
  await client.connect();

  const npcs = ['Valuecorp', 'Apex Automobili'];

  for (const name of npcs) {
    console.log(`\n===== ${name} =====`);

    const company = await client.query(
      `SELECT id, name, status, is_exchange_listed, npc_personality FROM companies WHERE name = $1 AND is_npc = true LIMIT 1`,
      [name]
    );
    if (!company.rows[0]) { console.log('  NOT FOUND'); continue; }
    const c = company.rows[0];
    console.log(`  Status: ${c.status} | Listed: ${c.is_exchange_listed}`);

    const fin = await client.query(`SELECT available_cash, debt, company_value FROM company_finances WHERE company_id = $1`, [c.id]);
    const f = fin.rows[0];
    console.log(`  Cash: $${Number(f?.available_cash).toLocaleString()} | Debt: $${Number(f?.debt).toLocaleString()} | Value: $${Number(f?.company_value).toLocaleString()}`);

    const models = await client.query(
      `SELECT name, status, development_status, sale_price, manufacturing_cost_per_unit, target_segment FROM manufacturing_vehicle_models WHERE company_id = $1`,
      [c.id]
    );
    console.log(`  Models (${models.rows.length}):`);
    for (const m of models.rows) {
      console.log(`    [${m.status}/${m.development_status}] ${m.name} | $${Number(m.sale_price).toLocaleString()} | segment: ${m.target_segment}`);
    }

    const factories = await client.query(
      `SELECT id, name, status, capacity_per_month FROM manufacturing_factories WHERE company_id = $1`,
      [c.id]
    );
    console.log(`  Factories (${factories.rows.length}):`);
    for (const fac of factories.rows) {
      console.log(`    [${fac.status}] ${fac.name} | capacity: ${fac.capacity_per_month}/mo`);
    }

    const lines = await client.query(
      `SELECT pl.status, pl.target_units_per_month, mv.name as model
       FROM manufacturing_production_lines pl
       LEFT JOIN manufacturing_vehicle_models mv ON mv.id = pl.assigned_vehicle_model_id
       WHERE pl.company_id = $1`,
      [c.id]
    );
    console.log(`  Production Lines (${lines.rows.length}):`);
    for (const l of lines.rows) {
      console.log(`    [${l.status}] ${l.target_units_per_month} units/mo → ${l.model}`);
    }

    const allocs = await client.query(
      `SELECT a.units_allocated, a.marketing_tier, rm.name as market, mv.name as model
       FROM manufacturing_market_allocations a
       LEFT JOIN manufacturing_region_markets rm ON rm.id = a.region_market_id
       LEFT JOIN manufacturing_vehicle_models mv ON mv.id = a.vehicle_model_id
       WHERE a.company_id = $1`,
      [c.id]
    );
    console.log(`  Market Allocations (${allocs.rows.length}):`);
    for (const a of allocs.rows) {
      console.log(`    ${a.units_allocated} units → ${a.market} [${a.marketing_tier}] via ${a.model}`);
    }

    const npcState = await client.query(
      `SELECT ns.*, mv.name as model_name
       FROM manufacturing_npc_state ns
       LEFT JOIN manufacturing_vehicle_models mv ON mv.id = ns.vehicle_model_id
       WHERE ns.company_id = $1`,
      [c.id]
    );
    console.log(`  NPC Brain State: ${npcState.rows.length > 0 ? `model="${npcState.rows[0].model_name}"` : 'MISSING ⚠️'}`);
  }

  await client.end();
}

main().catch(console.error);
