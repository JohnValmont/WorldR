const fs = require('fs');

let content = fs.readFileSync('src/api/controllers/manufacturing.controller.ts', 'utf8');

const target1 = `    for (const factory of factories) {
      const factoryType = await trx('manufacturing_factory_types').where({ id: factory.factory_type_id }).first();`;

const replace1 = `    const allFactoryTypes = await trx('manufacturing_factory_types');
    const existingInventoryMap = new Map();
    for (const inv of allInventoryInitial) {
       existingInventoryMap.set(inv.vehicle_model_id, { ...inv, _dirty: false, _isNew: false });
    }
    const factoryUpdates = [];

    for (const factory of factories) {
      const factoryType = allFactoryTypes.find((ft) => String(ft.id) === String(factory.factory_type_id));`;

const target2 = `        const existingInventory = await trx('manufacturing_inventory').where({ company_id: companyId, vehicle_model_id: line.model_id_ref }).first();
        const inventoryValue     = sellableUnits * costPerUnit;
        const storageCostPerArc  = Math.round(sellableUnits * storageCostPerUnit);

        if (existingInventory) {
          await trx('manufacturing_inventory').where({ id: existingInventory.id }).update({ units_in_stock: Number(existingInventory.units_in_stock) + sellableUnits, inventory_value: Number(existingInventory.inventory_value) + inventoryValue, storage_cost_per_month: Number(existingInventory.storage_cost_per_month) + storageCostPerArc, updated_at: trx.fn.now() });
        } else {
          await trx('manufacturing_inventory').insert({ world_instance_id: company.world_instance_id, company_id: companyId, vehicle_model_id: line.model_id_ref, units_in_stock: sellableUnits, inventory_value: inventoryValue, storage_cost_per_month: storageCostPerArc });
        }
      }

      // durability-val: reduces condition decay from 2pts to 1pt per month
      const conditionDecay = hasDurabilityVal ? 1 : 2;
      await trx('manufacturing_factories').where({ id: factory.id }).update({ condition: Math.max(10, Number(factory.condition) - conditionDecay), updated_at: trx.fn.now() });
    }`;

const replace2 = `        const inventoryValue     = sellableUnits * costPerUnit;
        const storageCostPerArc  = Math.round(sellableUnits * storageCostPerUnit);

        let existingInv = existingInventoryMap.get(line.model_id_ref);
        if (existingInv) {
            existingInv.units_in_stock = Number(existingInv.units_in_stock) + sellableUnits;
            existingInv.inventory_value = Number(existingInv.inventory_value) + inventoryValue;
            existingInv.storage_cost_per_month = Number(existingInv.storage_cost_per_month) + storageCostPerArc;
            existingInv._dirty = true;
        } else {
            existingInv = {
                _isNew: true,
                world_instance_id: company.world_instance_id,
                company_id: companyId,
                vehicle_model_id: line.model_id_ref,
                units_in_stock: sellableUnits,
                inventory_value: inventoryValue,
                storage_cost_per_month: storageCostPerArc
            };
            existingInventoryMap.set(line.model_id_ref, existingInv);
        }
      }

      // durability-val: reduces condition decay from 2pts to 1pt per month
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

if (!content.includes(target1)) console.log("Target 1 not found!");
if (!content.includes(target2)) console.log("Target 2 not found!");

content = content.replace(target1, replace1);
content = content.replace(target2, replace2);

fs.writeFileSync('src/api/controllers/manufacturing.controller.ts', content, 'utf8');
console.log("Done");
