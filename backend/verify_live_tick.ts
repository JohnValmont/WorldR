import { Client } from 'pg';

process.env.DATABASE_URL = 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

import { db } from './src/config/database';
import { ManufacturingController } from './src/api/controllers/manufacturing.controller';

async function main() {
  console.log("Starting verification...");
  try {
    await db.transaction(async (trx) => {
      console.log("Transaction started. Fetching clock...");
      
      const activeInstance = await trx('world_instances').where({ status: 'active' }).first();
      const clock = await trx('world_clock').where({ world_instance_id: activeInstance.id }).first();
      
      console.log(`Running processCountryMonth for Drennia (Y${clock.current_year} M${clock.current_month})...`);
      
      const result = await ManufacturingController.processCountryMonth(trx, 'drennia', clock);
      
      console.log("Process succeeded!");
      console.log("Processed Companies:", result.processedCompanies);
      
      const newSales = await trx('manufacturing_sales_results')
        .where({ world_year: clock.current_year, world_month: clock.current_month })
        .count('* as count')
        .first();
        
      console.log(`Simulated Sales Records Created: ${newSales?.count}`);

      // Now query total units sold in this simulated tick
      const totalUnits = await trx('manufacturing_sales_results')
        .where({ world_year: clock.current_year, world_month: clock.current_month })
        .sum('units_sold as sum')
        .first();

      console.log(`Total Units Sold Simulated: ${totalUnits?.sum || 0}`);

      console.log("Rolling back transaction so no data is saved to live...");
      throw new Error("ROLLBACK_SUCCESS");
    });
  } catch(e: any) {
    if (e.message === "ROLLBACK_SUCCESS") {
      console.log("Rollback completed safely.");
    } else {
      console.error("Tick failed with error:", e);
    }
  } finally {
    await db.destroy();
  }
}

main();
