/**
 * fix_npc_respawn_with_land.ts
 *
 * One-time admin fix:
 *  1. Find the distressed/bankrupt Apex Automobili and Valuecorp companies.
 *  2. Refund ALL players who hold shares in them (at last known share price × shares held).
 *  3. Cancel all open share orders for those companies and refund escrow.
 *  4. Mark old companies bankrupt and rename them to [DISSOLVED].
 *  5. Respawn each with:
 *       - $5 000 000 seed capital
 *       - A proper land plot (so book-value calculations work correctly)
 *       - A factory linked to that plot
 *       - A single high-quality car model
 *       - Listed on the exchange immediately
 *
 * Run once from backend root:
 *   npx ts-node fix_npc_respawn_with_land.ts
 */

process.env.DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

import { db } from './src/config/database';

const SEED_CAPITAL   = 5_000_000;
const LAND_ACRES     = 20;
const LAND_STATE_ID  = 'drennia-drennport';

// What to respawn — must match npc_personality keys in NPC_ROSTER
const TARGETS: { personality: string; modelName: string; salePrice: number; mfgCost: number; scores: Record<string, number>; segment: string; platform: string; powerUnit: string; drivetrain: string; interior: string; safety: string; vehicleClass: string }[] = [
  {
    personality: 'valuecorp',
    modelName:   'Valuecorp Vortex Dominator',
    salePrice:   16_000,
    mfgCost:     8_800,   // ~55%
    segment:     'Budget',
    platform:    'economy',
    powerUnit:   'small-i4',
    drivetrain:  'fwd',
    interior:    'comfort',      // upgrade from 'basic'
    safety:      'enhanced',     // upgrade from 'standard'
    vehicleClass:'Compact Car',
    scores: { reliability: 70, performance: 40, fuel_efficiency: 82, appeal: 55, cargo: 55, safety: 60 },
  },
  {
    personality: 'apex',
    modelName:   'Apex Automobili Quantum Pulse',
    salePrice:   62_000,
    mfgCost:     34_100,  // ~55%
    segment:     'Performance',
    platform:    'standard',
    powerUnit:   'v6',
    drivetrain:  'awd',
    interior:    'premium',
    safety:      'advanced',
    vehicleClass:'Sedan',
    scores: { reliability: 68, performance: 90, fuel_efficiency: 38, appeal: 85, cargo: 38, safety: 72 },
  },
];

async function run() {
  console.log('=== NPC Respawn Fix ===\n');

  const clock = await db('world_clock').first();
  if (!clock) throw new Error('No world_clock row found.');
  const activeInstance = await db('world_instances').where({ status: 'active' }).first();
  if (!activeInstance) throw new Error('No active world instance found.');

  for (const target of TARGETS) {
    console.log(`\n--- Processing personality: ${target.personality} ---`);

    // 1. Find ALL companies with this personality that are distressed OR bankrupt
    const oldCompanies = await db('companies')
      .where({ npc_personality: target.personality })
      .whereIn('status', ['distressed', 'bankrupt', 'active'])
      .whereNot('name', 'like', '[DISSOLVED]%');

    if (oldCompanies.length === 0) {
      console.log(`  No existing company found for ${target.personality}. Will still spawn fresh.`);
    }

    for (const old of oldCompanies) {
      console.log(`  Found: "${old.name}" (id=${old.id}, status=${old.status})`);

      // 2. Find all PLAYER share holders (exclude system NPC character)
      const sysChar = await db('characters').join('users', 'characters.user_id', 'users.id')
        .where({ 'users.email': 'system_npc@worldr.game' })
        .select('characters.id')
        .first();
      const sysCharId = sysChar?.id;

      const holders = await db('company_shares')
        .where({ company_id: old.id })
        .whereNot({ holder_character_id: sysCharId ?? 'none' })
        .where('shares', '>', 0);

      // Get last known share price for refund calculation
      const lastPrice = await db('share_price_history')
        .where({ company_id: old.id })
        .orderBy([{ column: 'game_year', order: 'desc' }, { column: 'game_month', order: 'desc' }])
        .select('close_price')
        .first();
      const pricePerShare = lastPrice ? Number(lastPrice.close_price) : 1;
      console.log(`  Last share price: $${pricePerShare.toFixed(4)} | Holders: ${holders.length}`);

      // 3. Refund shareholders
      if (holders.length > 0) {
        await db.transaction(async (trx) => {
          for (const h of holders) {
            const refundAmount = Math.round(Number(h.shares) * pricePerShare * 100) / 100;
            if (refundAmount <= 0) continue;

            await trx('character_finances')
              .where({ character_id: h.holder_character_id })
              .increment('cash_in_hand', refundAmount);

            // Zero out the share holding
            await trx('company_shares')
              .where({ company_id: old.id, holder_character_id: h.holder_character_id })
              .delete();

            console.log(`  Refunded $${refundAmount.toLocaleString()} to character ${h.holder_character_id} (${h.shares} shares @ $${pricePerShare.toFixed(4)})`);

            // Write a ledger note
            await trx('company_records').insert({
              world_instance_id: activeInstance.id,
              company_id:        old.id,
              record_type:       'business',
              summary:           `Share refund: ${h.shares} shares returned to character ${h.holder_character_id} at $${pricePerShare.toFixed(4)}/share ($${refundAmount.toLocaleString()} total) following company restructuring.`,
              created_at_world_year:  clock.current_year,
              created_at_world_month: clock.current_month,
              created_at_world_day:   clock.current_day ?? 1,
            }).catch(() => {});
          }
        });
      }

      // 4. Cancel all open share orders and refund escrow
      await db.transaction(async (trx) => {
        const openOrders = await trx('share_orders')
          .where({ company_id: old.id, status: 'open' });
        for (const order of openOrders) {
          if (order.side === 'buy' && Number(order.escrow_amount) > 0) {
            await trx('character_finances')
              .where({ character_id: order.character_id })
              .increment('cash_in_hand', Number(order.escrow_amount));
            console.log(`  Refunded escrow $${Number(order.escrow_amount).toLocaleString()} to character ${order.character_id} (order ${order.id})`);
          }
          await trx('share_orders').where({ id: order.id }).update({
            status:     'cancelled',
            updated_at: trx.fn.now(),
          });
        }
        if (openOrders.length > 0) console.log(`  Cancelled ${openOrders.length} open share orders.`);
      });

      // 5. Cancel any open acquisition auctions for this company
      await db('company_acquisitions')
        .where({ company_id: old.id })
        .whereIn('status', ['registration', 'bidding'])
        .update({ status: 'cancelled', updated_at: db.fn.now() });

      // 6. Dissolve the old company
      await db('companies').where({ id: old.id }).update({
        status:              'bankrupt',
        name:                `[DISSOLVED Y${clock.current_year}M${clock.current_month}] ${old.name}`,
        is_exchange_listed:  false,
        updated_at:          db.fn.now(),
      });
      await db('manufacturing_factories').where({ company_id: old.id }).update({ status: 'inactive' });
      await db('manufacturing_production_lines').where({ company_id: old.id }).update({ status: 'inactive' });
      await db('manufacturing_market_allocations').where({ company_id: old.id }).delete();
      console.log(`  Dissolved "${old.name}"`);
    }

    // 7. Respawn fresh company
    console.log(`\n  Spawning fresh ${target.personality}...`);
    await db.transaction(async (trx) => {

      // -- System user / character --
      let sysUser = await trx('users').where({ email: 'system_npc@worldr.game' }).first();
      if (!sysUser) {
        const [u] = await trx('users').insert({ email: 'system_npc@worldr.game', password_hash: 'no_login_allowed' }).returning('*');
        sysUser = u;
      }
      let sysChar = await trx('characters').where({ user_id: sysUser.id }).first();
      if (!sysChar) {
        const [c] = await trx('characters').insert({
          user_id:              sysUser.id,
          world_instance_id:    activeInstance.id,
          motherland_country_id:'drennia',
          name:                 'System NPC',
          age:                  30,
          created_at_world_year: clock.current_year,
          created_at_world_month: clock.current_month,
          created_at_world_day: 0,
        }).returning('*');
        sysChar = c;
      }

      // -- Company name (derive from personality key) --
      const rosterNames: Record<string, string> = {
        valuecorp: 'Valuecorp',
        apex:      'Apex Automobili',
        veridian:  'Veridian Motors',
        haulpro:   'HaulPro',
      };
      const companyName = rosterNames[target.personality] ?? target.personality;

      // -- Company --
      const [company] = await trx('companies').insert({
        owner_character_id:    sysChar.id,
        world_instance_id:     activeInstance.id,
        country_id:            'drennia',
        headquarters_state_id: LAND_STATE_ID,
        industry_id:           'manufacturing',
        legal_structure_id:    'sole-trader',
        currency_id:           'dollar',
        name:                  companyName,
        status:                'active',
        is_npc:                true,
        is_exchange_listed:    true,
        npc_personality:       target.personality,
        reputation:            55,
        reliability:           55,
        created_at_world_year: clock.current_year,
        created_at_world_month: clock.current_month,
        created_at_world_day:  0,
      }).returning('*');
      console.log(`    Created company: ${company.name} (id=${company.id})`);

      // -- Finances ($5M, no debt) --
      await trx('company_finances').insert({
        company_id:      company.id,
        currency_id:     'dollar',
        available_cash:  SEED_CAPITAL,
        debt:            0,
        company_value:   SEED_CAPITAL,
        last_arc_profit: 0,
      });

      // -- Land Plot (linked to state so book-value JOIN works correctly) --
      const landCost = 500_000; // not deducted from cash — it's a grant to bootstrap
      const [plot] = await trx('manufacturing_land_plots').insert({
        world_instance_id: activeInstance.id,
        company_id:        company.id,
        state_id:          LAND_STATE_ID,
        name:              `${companyName} Industrial Site`,
        total_acres:       LAND_ACRES,
        used_acres:        0,
        purchase_price:    landCost,
      }).returning('*');
      console.log(`    Land plot created: ${plot.id}`);

      // -- Factory linked to the land plot --
      const factoryType = await trx('manufacturing_factory_types').where({ id: 'small-workshop' }).first();
      if (!factoryType) throw new Error('Factory type small-workshop not found');

      const [factory] = await trx('manufacturing_factories').insert({
        company_id:                company.id,
        world_instance_id:         activeInstance.id,
        country_id:                'drennia',
        state_id:                  LAND_STATE_ID,
        land_plot_id:              plot.id,           // ← key: linked to plot
        factory_type_id:           'small-workshop',
        name:                      `${companyName} Primary Facility`,
        lease_cost_per_month:      25_000,
        maintenance_cost_per_month:8_000,
        capacity_per_month:        500,
        status:                    'active',
        created_at_world_year:     clock.current_year,
        created_at_world_month:    clock.current_month,
        created_at_world_day:      0,
      }).returning('*');
      console.log(`    Factory created: ${factory.id} (land_plot_id=${plot.id})`);

      // -- Update land plot used_acres --
      await trx('manufacturing_land_plots').where({ id: plot.id }).update({ used_acres: 10 });

      // -- Vehicle model --
      const [model] = await trx('manufacturing_vehicle_models').insert({
        company_id:                  company.id,
        world_instance_id:           activeInstance.id,
        name:                        target.modelName,
        vehicle_class:               target.vehicleClass,
        platform_type:               target.platform,
        power_unit_type:             target.powerUnit,
        drivetrain_type:             target.drivetrain,
        interior_tier:               target.interior,
        safety_tier:                 target.safety,
        target_segment:              target.segment,
        sale_price:                  target.salePrice,
        manufacturing_cost_per_unit: target.mfgCost,
        reliability_score:           target.scores.reliability,
        performance_score:           target.scores.performance,
        fuel_efficiency_score:       target.scores.fuel_efficiency,
        appeal_score:                target.scores.appeal,
        cargo_score:                 target.scores.cargo,
        safety_score:                target.scores.safety,
        development_status:          'launched',
        dev_stage:                   'ready_to_launch',
        status:                      'active',
        created_at_world_year:       clock.current_year,
        created_at_world_month:      clock.current_month,
        created_at_world_day:        0,
      }).returning('*');
      console.log(`    Model created: "${model.name}" (id=${model.id})`);

      // -- Production line --
      const targetUnits = target.personality === 'apex' ? 180 : 380;
      await trx('manufacturing_production_lines').insert({
        company_id:              company.id,
        world_instance_id:       activeInstance.id,
        factory_id:              factory.id,
        line_number:             1,
        assigned_vehicle_model_id: model.id,
        target_units_per_month:  targetUnits,
        status:                  'active',
      });

      // -- Staff --
      await trx('company_staff').insert({ company_id: company.id, role: 'factory-worker',         quantity: 30 });
      await trx('company_staff').insert({ company_id: company.id, role: 'production-supervisor',  quantity: 1 });
      await trx('company_staff').insert({ company_id: company.id, role: 'sales-manager',          quantity: 2 });
      if (target.personality === 'apex') {
        await trx('company_staff').insert({ company_id: company.id, role: 'automotive-engineer',  quantity: 1 });
        await trx('company_staff').insert({ company_id: company.id, role: 'quality-inspector',    quantity: 1 });
      }

      // -- State license --
      await trx('company_state_licenses').insert({
        company_id: company.id,
        state_id:   LAND_STATE_ID,
        status:     'active',
      });

      // -- Market allocation --
      const regionMarket = await trx('manufacturing_region_markets').where({ country_id: 'drennia' }).first();
      if (regionMarket) {
        await trx('manufacturing_market_allocations').insert({
          company_id:       company.id,
          world_instance_id: activeInstance.id,
          vehicle_model_id: model.id,
          region_market_id: regionMarket.id,
          units_allocated:  targetUnits,
          marketing_tier:   target.personality === 'apex' ? 'national' : 'regional',
        });
      }

      // -- NPC State --
      await trx('manufacturing_npc_state').insert({
        company_id:      company.id,
        vehicle_model_id: model.id,
      });

      // -- Seed share price history --
      const seedPrice = Math.max(1, Math.round((SEED_CAPITAL / 1_000_000) * 100) / 100);
      await trx('share_price_history').insert({
        company_id:   company.id,
        game_year:    clock.current_year,
        game_month:   clock.current_month,
        open_price:   seedPrice,
        high_price:   seedPrice,
        low_price:    seedPrice,
        close_price:  seedPrice,
        volume_shares: 0,
        market_cap:   seedPrice * 1_000_000,
        eps:          0,
      }).onConflict().ignore();

      // -- Seed system NPC's 1M-share holding (cap table denominator) --
      await trx('company_shares').insert({
        company_id:          company.id,
        holder_character_id: sysChar.id,
        shares:              1_000_000,
        avg_cost_basis:      seedPrice,
      }).onConflict().ignore();

      console.log(`    Seeded share price @ $${seedPrice}, 1M shares to System NPC`);
      console.log(`  ✓ ${companyName} respawned successfully with $${SEED_CAPITAL.toLocaleString()} + land plot`);
    });
  }

  console.log('\n=== All done. ===');
  await db.destroy();
}

run().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
