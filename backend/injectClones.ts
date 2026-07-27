import * as dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import * as crypto from 'crypto';
import { db } from './src/config/database';
async function run() {
  try {
    console.log("Starting clone injection...");
    const instance = await db('world_instances').where({ status: 'active' }).first();
    if (!instance) {
      console.log("No active instance found.");
      return;
    }

    const npcs = await db('companies').where({ is_npc: true }).limit(2);
    if (npcs.length < 2) {
      console.log("Not enough NPCs found.");
      return;
    }

    // Just pull the two best models in the DB
    const topModels = await db('manufacturing_vehicle_models as m')
      .join('companies as c', 'c.id', 'm.company_id')
      .where('c.is_npc', false)
      .select('m.*')
      .orderBy('m.appeal_score', 'desc')
      .limit(2);

    if (topModels.length < 2) {
      console.log("Not enough player models found. Found: " + topModels.length);
      return;
    }

    console.log(`Found top models: ${topModels[0].name}, ${topModels[1].name}`);

    const names = ['Dominator', 'Predator'];

    for (let i = 0; i < 2; i++) {
      const playerModel: any = topModels[i];
      const npc: any = npcs[i];
      
      const newModelId = crypto.randomUUID();
      const newModelName = `${npc.name} ${names[i]}`;

      console.log(`Cloning ${playerModel.name} to ${newModelName}`);

      const newModel = {
        id: newModelId,
        company_id: npc.id,
        name: newModelName,
        target_segment: playerModel.target_segment,
        vehicle_class: playerModel.vehicle_class,
        platform_type: playerModel.platform_type,
        power_unit_type: playerModel.power_unit_type,
        drivetrain_type: playerModel.drivetrain_type,
        interior_tier: playerModel.interior_tier,
        safety_tier: playerModel.safety_tier,
        quality_tier: playerModel.quality_tier,
        reliability_score: Math.min(100, Number(playerModel.reliability_score) + 5),
        performance_score: Math.min(100, Number(playerModel.performance_score) + 5),
        fuel_efficiency_score: Math.min(100, Number(playerModel.fuel_efficiency_score) + 5),
        appeal_score: Math.min(100, Number(playerModel.appeal_score) + 5),
        safety_score: Math.min(100, Number(playerModel.safety_score) + 5),
        cargo_score: Math.min(100, Number(playerModel.cargo_score) + 5),
        manufacturing_cost_per_unit: playerModel.manufacturing_cost_per_unit,
        sale_price: Math.max(1, Math.floor(Number(playerModel.sale_price) * 0.90)),
        development_status: 'launched',
        status: 'active',
        launched_year: playerModel.launched_year,
        launched_month: playerModel.launched_month,
        created_at_world_year: playerModel.created_at_world_year,
        created_at_world_month: playerModel.created_at_world_month,
        created_at: new Date(),
        updated_at: new Date()
      };

      await db('manufacturing_vehicle_models').insert(newModel);

      const factory = await db('manufacturing_factories').where({ company_id: npc.id }).first();
      if (factory) {
        await db('manufacturing_production_lines').insert({
          id: crypto.randomUUID(),
          company_id: npc.id,
          factory_id: factory.id,
          assigned_vehicle_model_id: newModelId,
          status: 'active',
          target_units_per_month: 250,
          created_at: new Date(),
          updated_at: new Date()
        });

        const market = await db('region_markets').first();
        if (market) {
          await db('manufacturing_market_allocations').insert({
            id: crypto.randomUUID(),
            company_id: npc.id,
            vehicle_model_id: newModelId,
            region_market_id: market.id,
            units_allocated: 250,
            sale_price: newModel.sale_price,
            marketing_tier: 'regional',
            created_at: new Date(),
            updated_at: new Date()
          });
          console.log(`Created line and allocation for ${newModelName}`);
        }
      }
    }
    
    console.log("Success!");

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
