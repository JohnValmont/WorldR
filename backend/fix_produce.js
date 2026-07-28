const fs = require('fs');

let content = fs.readFileSync('src/api/controllers/manufacturing.controller.ts', 'utf8');

const regex = /\/\/ durability-val: reduces condition decay from 2pts to 1pt per month\s+const conditionDecay = hasDurabilityVal \? 1 : 2;\s+await trx\('manufacturing_factories'\)\.where\(\{ id: factory\.id \}\)\.update\(\{ condition: Math\.max\(10, Number\(factory\.condition\) - conditionDecay\), updated_at: trx\.fn\.now\(\) \}\);\s+\}/g;

const replacement = `// durability-val: reduces condition decay from 2pts to 1pt per month
      const conditionDecay = hasDurabilityVal ? 1 : 2;
      factoryUpdates.push({ id: factory.id, condition: Math.max(10, Number(factory.condition) - conditionDecay) });
    }

    const invInserts = [];
    const invUpdates = [];
    for (const inv of existingInventoryMap.values()) {
        if (inv._isNew) {
            invInserts.push({
                world_instance_id: inv.world_instance_id,
                company_id: inv.company_id,
                vehicle_model_id: inv.vehicle_model_id,
                units_in_stock: inv.units_in_stock,
                inventory_value: inv.inventory_value,
                storage_cost_per_month: inv.storage_cost_per_month
            });
        } else if (inv._dirty) {
            invUpdates.push({
                id: inv.id,
                units_in_stock: inv.units_in_stock,
                inventory_value: inv.inventory_value,
                storage_cost_per_month: inv.storage_cost_per_month
            });
        }
    }
    
    if (invInserts.length > 0) {
        await trx('manufacturing_inventory').insert(invInserts);
    }
    
    for (const update of invUpdates) {
        await trx('manufacturing_inventory').where({ id: update.id }).update({
            units_in_stock: update.units_in_stock,
            inventory_value: update.inventory_value,
            storage_cost_per_month: update.storage_cost_per_month,
            updated_at: trx.fn.now()
        });
    }

    for (const f of factoryUpdates) {
      await trx('manufacturing_factories').where({ id: f.id }).update({ condition: f.condition, updated_at: trx.fn.now() });
    }`;

if (!regex.test(content)) {
    console.log("Could not find the target block with regex!");
} else {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/api/controllers/manufacturing.controller.ts', content, 'utf8');
    console.log("Successfully replaced block.");
}
