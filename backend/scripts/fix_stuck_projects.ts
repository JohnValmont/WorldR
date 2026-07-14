import { db } from '../src/config/database';

async function run() {
  try {
    const clock = await db('world_clock').first();
    console.log('Clock:', clock);
    const absCurrentMonth = clock.current_year * 12 + clock.current_month;

    // Fix Engineering Programmes
    const stuckProgrammes = await db('manufacturing_engineering_programmes')
      .whereIn('status', ['research', 'validation'])
      .whereRaw('(completion_arc_year * 12 + completion_month) <= ?', [absCurrentMonth + 1]);
    
    if (stuckProgrammes.length > 0) {
      console.log(`Fixing ${stuckProgrammes.length} stuck engineering programmes...`);
      for (const p of stuckProgrammes) {
        await db('manufacturing_engineering_programmes').where({ id: p.id }).update({ status: 'approved' });
        console.log(`- Approved programme: ${p.programme_id}`);
      }
    } else {
      console.log('No stuck engineering programmes found.');
    }

    // Fix Vehicle Models
    const stuckModels = await db('manufacturing_vehicle_models')
      .whereIn('dev_stage', ['engineering', 'prototype', 'testing'])
      .whereRaw('(development_completes_at_year * 12 + development_completes_at_month) <= ?', [absCurrentMonth + 1]);

    if (stuckModels.length > 0) {
      console.log(`Fixing ${stuckModels.length} stuck vehicle models...`);
      for (const m of stuckModels) {
        await db('manufacturing_vehicle_models').where({ id: m.id }).update({ dev_stage: 'ready_to_launch' });
        console.log(`- Set model ${m.name} to ready_to_launch`);
      }
    } else {
      console.log('No stuck vehicle models found.');
    }

  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

run();
