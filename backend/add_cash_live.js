const knex = require('knex');

const liveDbUrl = 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

const db = knex({
  client: 'pg',
  connection: liveDbUrl,
  pool: { min: 2, max: 10 }
});

async function addCash() {
  try {
    const comp = await db('companies').where('name', 'ilike', '%Aldrich%Automobiles%').first();
    if (!comp) {
      console.log('Company not found on LIVE DB either!');
      
      const all = await db('companies').select('name');
      console.log('Live companies:');
      all.forEach(c => console.log(c.name));
      return;
    }
    
    console.log(`Found LIVE company: ${comp.name} (ID: ${comp.id})`);
    
    const finance = await db('company_finances').where({ company_id: comp.id }).first();
    if (!finance) {
      console.log('No finance record found!');
      return;
    }
    
    const newCash = Number(finance.available_cash) + 90000000;
    
    await db('company_finances').where({ company_id: comp.id }).update({ available_cash: newCash });
    
    console.log(`Successfully added 90M cash. New balance: ${newCash.toLocaleString()}`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    db.destroy();
  }
}
addCash();
