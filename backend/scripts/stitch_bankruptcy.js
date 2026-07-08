const fs = require('fs');

// 1. Append spawnNpc to npcBrain.service.ts
let npcBrain = fs.readFileSync('src/api/services/npcBrain.service.ts', 'utf8');

if (!npcBrain.includes('export async function spawnNpc')) {
  // Add NPC_ROSTER import if missing
  if (!npcBrain.includes('NPC_ROSTER')) {
    npcBrain = npcBrain.replace(
      '} from \'../constants/npc\';',
      '  NPC_ROSTER\n} from \'../constants/npc\';'
    );
  }

  const spawnLogic = `
/**
 * Spawns a fresh NPC company with the specified personality.
 */
export async function spawnNpc(trx: Knex, personality: string, countryId: string, clock: any): Promise<void> {
  const roster = NPC_ROSTER.find(r => r.key === personality);
  if (!roster) throw new Error(\`Unknown NPC personality: \${personality}\`);

  // 1. Ensure system character exists
  let sysUser = await trx('users').where({ email: 'system_npc@worldr.game' }).first();
  if (!sysUser) {
    const [insertedUser] = await trx('users')
      .insert({ email: 'system_npc@worldr.game', password_hash: 'no_login_allowed' })
      .returning('*');
    sysUser = insertedUser;
  }

  let sysChar = await trx('characters').where({ user_id: sysUser.id }).first();
  if (!sysChar) {
    const [insertedChar] = await trx('characters')
      .insert({
        user_id: sysUser.id,
        world_instance_id: clock.world_instance_id,
        motherland_country_id: countryId,
        name: 'System NPC',
        age: 30,
        created_at_world_year: clock.world_year,
        created_at_world_month: clock.world_month,
        created_at_world_day: 0
      })
      .returning('*');
    sysChar = insertedChar;
  }

  // 2. Get a standard factory type and region market
  const factoryType = await trx('manufacturing_factory_types').where({ id: 'small-workshop' }).first();
  const regionMarket = await trx('manufacturing_region_markets').where({ country_id: countryId }).first();

  if (!sysChar || !factoryType || !regionMarket) {
    console.log('Skipping NPC seed: missing dependencies.');
    return;
  }

  // 3. Create Company
  const [company] = await trx('companies')
    .insert({
      owner_character_id: sysChar.id,
      world_instance_id: clock.world_instance_id,
      country_id: countryId,
      headquarters_state_id: 'drennia-drennport', // fallback
      industry_id: 'manufacturing',
      legal_structure_id: 'sole-trader',
      currency_id: 'dollar', // fallback
      name: roster.name,
      status: 'active',
      is_npc: true,
      npc_personality: roster.key,
      reputation: 50,
      reliability: 50,
      created_at_world_year: clock.world_year,
      created_at_world_month: clock.world_month,
      created_at_world_day: 0
    })
    .returning('*');

  // Finances
  await trx('company_finances').insert({
    company_id: company.id,
    currency_id: 'dollar',
    available_cash: roster.seedCapital,
    debt: 0,
    company_value: roster.seedCapital,
    last_arc_profit: 0
  });

  // Model
  const [model] = await trx('manufacturing_vehicle_models')
    .insert({
      company_id: company.id,
      world_instance_id: clock.world_instance_id,
      name: \`\${roster.name} Standard\`,
      vehicle_class: roster.build.platform === 'heavy-duty' ? 'Utility Van' : (roster.build.platform === 'economy' ? 'Compact Car' : 'Sedan'),
      platform_type: roster.build.platform,
      power_unit_type: roster.build.powerUnit,
      drivetrain_type: roster.build.drivetrain,
      interior_tier: roster.build.interior,
      safety_tier: roster.build.safety,
      target_segment: roster.segment,
      sale_price: roster.salePrice,
      manufacturing_cost_per_unit: Math.round(roster.salePrice * 0.55),
      reliability_score: roster.scores.reliability,
      performance_score: roster.scores.performance,
      fuel_efficiency_score: roster.scores.fuel_efficiency,
      appeal_score: roster.scores.appeal,
      cargo_score: roster.scores.cargo,
      safety_score: roster.scores.safety || 50,
      development_status: 'launched',
      dev_stage: 'ready_to_launch',
      status: 'active',
      created_at_world_year: clock.world_year,
      created_at_world_month: clock.world_month,
      created_at_world_day: 0
    })
    .returning('*');

  // Factory
  const [factory] = await trx('manufacturing_factories')
    .insert({
      company_id: company.id,
      world_instance_id: clock.world_instance_id,
      country_id: countryId,
      state_id: 'drennia-drennport',
      factory_type_id: factoryType.id,
      name: \`\${roster.name} Primary Facility\`,
      lease_cost_per_arc: 25000,
      maintenance_cost_per_arc: 8000,
      capacity_per_arc: 500,
      status: 'active',
      created_at_world_year: clock.world_year,
      created_at_world_month: clock.world_month,
      created_at_world_day: 0
    })
    .returning('*');

  // Production Line
  await trx('manufacturing_production_lines')
    .insert({
      company_id: company.id,
      world_instance_id: clock.world_instance_id,
      factory_id: factory.id,
      line_number: 1,
      assigned_vehicle_model_id: model.id,
      target_units_per_arc: roster.targetUnitsPerArc,
      status: 'active'
    });

  // Staff
  await trx('company_staff').insert({ company_id: company.id, role: 'factory_worker', quantity: 30 });
  await trx('company_staff').insert({ company_id: company.id, role: 'supervisor', quantity: roster.staff.supervisor });
  await trx('company_staff').insert({ company_id: company.id, role: 'sales_manager', quantity: roster.staff.salesManager });
  if (roster.staff.engineer > 0) {
    await trx('company_staff').insert({ company_id: company.id, role: 'engineer', quantity: roster.staff.engineer });
  }
  if (roster.staff.inspector > 0) {
    await trx('company_staff').insert({ company_id: company.id, role: 'inspector', quantity: roster.staff.inspector });
  }

  // Allocation
  await trx('manufacturing_market_allocations')
    .insert({
      company_id: company.id,
      world_instance_id: clock.world_instance_id,
      vehicle_model_id: model.id,
      region_market_id: regionMarket.id,
      units_allocated: roster.targetUnitsPerArc,
      marketing_tier: roster.marketingTier
    });

  // NPC State
  await trx('manufacturing_npc_state')
    .insert({
      company_id: company.id,
      vehicle_model_id: model.id
    });
}
`;

  fs.writeFileSync('src/api/services/npcBrain.service.ts', npcBrain + '\n' + spawnLogic);
  console.log('Added spawnNpc to npcBrain.service.ts');
}


// 2. Add bankruptcy logic to manufacturing.controller.ts
let controller = fs.readFileSync('src/api/controllers/manufacturing.controller.ts', 'utf8');

if (!controller.includes('BANKRUPTCY_FLOOR')) {
  controller = controller.replace(
    'import { MARKETING, awarenessGain } from \'../constants/marketing\';',
    'import { MARKETING, awarenessGain } from \'../constants/marketing\';\nimport { BANKRUPTCY_FLOOR } from \'../constants/npc\';\nimport { spawnNpc } from \'../services/npcBrain.service\';'
  );
}

const bankruptcyBlock = `
        // 6. BANKRUPTCY HANDLING (NPCs only)
        for (const company of participants) {
           if (company.is_npc) {
              const fin = await trx('company_finances').where({ company_id: company.id }).first();
              if (fin && parseFloat(fin.available_cash) < BANKRUPTCY_FLOOR) {
                 // Retire the old NPC
                 await trx('companies').where({ id: company.id }).update({ status: 'bankrupt' });
                 await trx('manufacturing_factories').where({ company_id: company.id }).update({ status: 'inactive' });
                 await trx('manufacturing_production_lines').where({ company_id: company.id }).update({ status: 'inactive' });
                 await trx('manufacturing_market_allocations').where({ company_id: company.id }).del();
                 
                 // Re-seed a FRESH NPC of the same personality
                 await spawnNpc(trx, company.npc_personality, company.country_id, clock);
                 
                 console.log(\`[NPC Bankruptcy] \${company.name} (\${company.id}) went bankrupt with \${fin.available_cash} cash. Respawned fresh \${company.npc_personality}!\`);
              }
           }
        }
`;

if (!controller.includes('6. BANKRUPTCY HANDLING')) {
  const searchStr = 'for (const pState of participantStates) {\n           const compResults = pooledSalesResults.filter((r: any) => r.alloc.company_id === pState.company.id);\n           await ManufacturingController.settleForCompany(trx, pState, compResults, clock, brandMap);\n         }';
  
  if (controller.includes(searchStr)) {
    controller = controller.replace(searchStr, searchStr + '\n' + bankruptcyBlock);
    fs.writeFileSync('src/api/controllers/manufacturing.controller.ts', controller);
    console.log('Added bankruptcy check to processManufacturingArc');
  } else {
    console.log('Could not find injection point in controller!');
  }
}
