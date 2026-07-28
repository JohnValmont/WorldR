import { Client } from 'pg';
import { ManufacturingController } from './src/api/controllers/manufacturing.controller';
import knex from 'knex';

const db = knex({
  client: 'pg',
  connection: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'
});

async function main() {
  setInterval(() => console.log('EVENT LOOP ALIVE:', new Date().toISOString()), 1000);
  try {
    const clock = await db('world_clock').where({ world_instance_id: 'pre-alpha-world-1' }).first();
    console.log("Current Clock:", clock.current_year, clock.current_month);
    
    console.log("Starting transaction...");
    await db.transaction(async (sp) => {
       await sp.raw(`SET LOCAL statement_timeout = '15s'`);
       await sp.raw(`SET LOCAL lock_timeout = '15s'`);
       
       console.log("Got transaction, running processCountryMonth...");
       const result = await ManufacturingController.processCountryMonth(sp, 'drennia', clock);
       console.log("Success! Finished processCountryMonth.");
       throw new Error("ROLLBACK_ON_PURPOSE");
    });
  } catch(e) {
    if (e.message !== "ROLLBACK_ON_PURPOSE") {
       console.error("ACTUAL CRASH:");
       console.error(e);
       if (e.query) console.error("Query:", e.query);
    } else {
       console.log("Finished testing.");
    }
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

main();
