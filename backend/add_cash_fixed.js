const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: 'postgres://postgres:postgres@localhost:5432/worldr_db'
});

async function run() {
  try {
    const allCompanies = await db('companies').select('id', 'name');
    const target = allCompanies.find(c => c.name.toLowerCase().includes('aldrich'));
    
    if (!target) {
      console.log('Could not find any company containing "aldrich". Here are all company names:');
      allCompanies.forEach(c => console.log(c.name));
      return;
    }

    console.log(`Found target: ${target.name} (ID: ${target.id})`);
    const finance = await db('company_finances').where({ company_id: target.id }).first();
    if (!finance) {
      console.log('No finance record found for company!');
      return;
    }
    
    const newCash = Number(finance.available_cash) + 90000000;
    await db('company_finances').where({ company_id: target.id }).update({ available_cash: newCash });
    console.log(`Successfully added 90M cash to ${target.name}. New balance: ${newCash.toLocaleString()}`);

  } catch (err) {
    console.error(err);
  } finally {
    db.destroy();
  }
}
run();
