const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/worldr_db',
});
client.connect().then(async () => {
  try {
    const res = await client.query("SELECT * FROM manufacturing_vehicle_models WHERE development_status = 'in_development'");
    console.log(`Found ${res.rows.length} models in development.`);
    for (const model of res.rows) {
      console.log(`Model: ${model.name}, Stage: ${model.dev_stage}, completion: ${model.development_completes_at_year}-${model.development_completes_at_month}`);
      // Manually set it to ready_to_launch if it's past August Year 0
      // The current clock is Year 0 Month 10.
      if (model.development_completes_at_year === 0 && model.development_completes_at_month <= 10) {
        console.log(`Unsticking model ${model.name}...`);
        await client.query("UPDATE manufacturing_vehicle_models SET dev_stage = 'ready_to_launch', development_status = 'ready_to_launch' WHERE id = $1", [model.id]);
        console.log(`Unstuck ${model.name}.`);
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
});
