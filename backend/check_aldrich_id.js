const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: 'postgres://postgres:postgres@localhost:5432/worldr_db'
});

async function run() {
  try {
    const comp = await db('companies').where({ id: 'd84d37c9-4449-4d1c-a237-33ab7b3e7fba' }).first();
    if (comp) {
      console.log('Company found by ID:', comp.name);
      console.log('Bytes of name:', Buffer.from(comp.name));
    } else {
      console.log('Company d84d37c9... not found in worldr_db!');
    }
  } finally {
    db.destroy();
  }
}
run();
