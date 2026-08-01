const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: 'postgres://postgres:postgres@localhost:5432/postgres'
});

async function run() {
  try {
    const dbs = await db.raw('SELECT datname FROM pg_database;');
    console.log(dbs.rows.map(r => r.datname));
  } finally {
    db.destroy();
  }
}
run();
