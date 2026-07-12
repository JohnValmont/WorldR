const knex = require('knex');
const db = knex({
  client: 'pg',
  connection: 'postgresql://postgres:postgres@localhost:5432/worldr_db'
});
(async () => {
  try {
    await db.raw('ALTER TABLE manufacturing_factories ADD COLUMN auto_condition_recovery BOOLEAN DEFAULT false;');
    console.log('Migration applied.');
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
})();
