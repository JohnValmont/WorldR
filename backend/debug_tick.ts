import { db } from './src/config/database';
import { ManufacturingController } from './src/api/controllers/manufacturing.controller';

async function run() {
  const clock = await db('world_clock').first();
  const playerCompany = await db('companies').where({ is_npc: false }).first();
  
  if (!playerCompany) {
    console.log("Player company not found");
    process.exit(1);
  }

  try {
    await db.transaction(async (trx) => {
      console.log("Running processCountryMonth for", playerCompany.name);
      await ManufacturingController.processCountryMonth(trx, playerCompany.country_id, clock);
      console.log("Success!");
      throw new Error("ROLLBACK_FOR_TESTING");
    });
  } catch (err: any) {
    if (err.message !== "ROLLBACK_FOR_TESTING") {
      console.error("Crash during processCountryMonth:", err);
    } else {
      console.log("Completed without internal crash.");
    }
  }
  process.exit(0);
}
run();
