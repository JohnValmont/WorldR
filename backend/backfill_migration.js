const knex = require('knex');
require('dotenv').config();
const db = knex({ client: 'pg', connection: process.env.DATABASE_URL });
async function run() {
  try {
    const tableExists = await db.schema.hasTable('schema_migrations');
    if (tableExists) {
      await db('schema_migrations').insert({ version: '0025_add_safety_score.sql' }).onConflict('version').ignore();
      console.log('Backfilled schema_migrations table (version field).');
    } else {
        const knexMigrationsExists = await db.schema.hasTable('knex_migrations');
        if (knexMigrationsExists) {
            await db('knex_migrations').insert({ name: '0025_add_safety_score.sql', batch: 1, migration_time: new Date() });
            console.log('Backfilled knex_migrations table.');
        } else {
            console.log('No migration tracking table found.');
        }
    }
  } catch(e) {
    console.error(e);
  }
  process.exit();
}
run();
