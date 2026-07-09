import { db } from './src/config/database';

async function fix() {
  try {
    const clock = await db('world_clock').first();
    const currentYear = clock.current_year || 0;
    const currentMonth = clock.current_month || 0;

    const models = await db('manufacturing_vehicle_models').where({ development_status: 'in_development' });
    console.log(`Found ${models.length} models in development.`);
    for (const model of models) {
      console.log(`Model: ${model.name}, Stage: ${model.dev_stage}, completion: ${model.development_completes_at_year}-${model.development_completes_at_month}`);
      if (model.development_completes_at_year < currentYear || (model.development_completes_at_year === currentYear && model.development_completes_at_month <= currentMonth)) {
        console.log(`Unsticking model ${model.name}...`);
        await db('manufacturing_vehicle_models').where({ id: model.id }).update({ dev_stage: 'ready_to_launch', development_status: 'ready_to_launch' });
        console.log(`Unstuck ${model.name}.`);
      } else {
        console.log(`Model ${model.name} is not overdue.`);
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    await db.destroy();
  }
}

fix();
