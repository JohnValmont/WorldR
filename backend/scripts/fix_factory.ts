import { db } from '../src/config/database';

async function run() {
  try {
    const updated = await db('manufacturing_factories')
      .where('expansion_status', 'construction_underway')
      .where('expansion_completion_year', '<=', 2)
      .where('expansion_completion_month', '<=', 12)
      .update({
        expansion_status: 'expanded',
        capacity_per_month: 200,
        lease_cost_per_month: 45000,
        maintenance_cost_per_month: 15000,
        worker_capacity: 80,
      })
      .returning('*');

    console.log('Updated factories:', updated.length);

    for (const factory of updated) {
      const existing = await db('manufacturing_production_lines')
        .where({ factory_id: factory.id, line_number: 2 })
        .first();

      if (!existing) {
        await db('manufacturing_production_lines').insert({
          world_instance_id: factory.world_instance_id,
          company_id: factory.company_id,
          factory_id: factory.id,
          line_number: 2,
          quality_setting: 'Standard',
          target_units_per_month: 0,
          status: 'idle',
        });
        console.log(`Inserted line 2 for factory ${factory.id}`);
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

run();
