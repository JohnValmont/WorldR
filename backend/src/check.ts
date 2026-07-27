import { db } from './config/database'; 

async function run() {
  const playerCompanies = await db('companies').whereNotNull('owner_character_id');
  console.log(`Found ${playerCompanies.length} player companies.`);
  
  for (const comp of playerCompanies) {
    console.log(`\n--- Company: ${comp.name} (ID: ${comp.id}) ---`);
    
    const inventory = await db('manufacturing_inventory').where({ company_id: comp.id });
    console.log("Inventory:", JSON.stringify(inventory, null, 2));
    
    const allocs = await db('manufacturing_market_allocations').where({ company_id: comp.id });
    console.log("Allocations:", JSON.stringify(allocs, null, 2));
    
    const sales = await db('manufacturing_sales_results').where({ company_id: comp.id });
    console.log("Sales:", JSON.stringify(sales, null, 2));
    
    const prod = await db('manufacturing_production_lines').where({ company_id: comp.id });
    console.log("Production Lines:", JSON.stringify(prod, null, 2));
  }
  
  process.exit(0);
}
run();
