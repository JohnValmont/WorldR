import knex from 'knex';
const db = knex({ client: 'pg', connection: 'postgres://postgres:postgres@localhost:5432/worldr_db' });
async function run() {
  try {
    const alloc = await db('manufacturing_market_allocations').first();
    console.log('Alloc ID:', alloc.id);
    await db('manufacturing_market_allocations').where({ id: alloc.id }).update({
      monthly_target: 100
    });
    console.log('Success!');
  } catch (e: any) {
    console.error('Error:', e.message);
  } finally {
    db.destroy();
  }
}
run();
