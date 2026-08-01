const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: 'postgres://postgres:postgres@localhost:5432/worldr_db'
});

async function addCash() {
  try {
    // Search for a model named like '%Aldrich%' or '%Sovereign%'
    const model = await db('manufacturing_vehicle_models').where('name', 'ilike', '%Aldrich%').orWhere('name', 'ilike', '%Sovereign%').first();
    let companyId;
    
    if (model) {
      console.log(`Found model: ${model.name}, linking to company ${model.company_id}`);
      companyId = model.company_id;
    } else {
      // Maybe the user meant "Test Mfg"? Let's just grab the first player company
      const comp = await db('companies').where({ is_npc: false }).first();
      companyId = comp.id;
      console.log(`Model not found, defaulting to first player company: ${comp.name} (ID: ${companyId})`);
    }

    const finance = await db('company_finances').where({ company_id: companyId }).first();
    if (!finance) {
      console.log('No finance record found for company!');
      return;
    }
    
    const newCash = Number(finance.available_cash) + 90000000;
    
    await db('company_finances').where({ company_id: companyId }).update({ available_cash: newCash });
    
    const updatedComp = await db('companies').where({ id: companyId }).first();
    console.log(`Successfully added 90M cash to ${updatedComp.name}. New balance: ${newCash.toLocaleString()}`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    db.destroy();
  }
}
addCash();
