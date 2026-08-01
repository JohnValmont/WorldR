const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: 'postgres://postgres:postgres@localhost:5432/worldr_db'
});

async function check() {
  try {
    const comps = await db('companies').where({ is_npc: false });
    console.log('Player Companies:');
    for (const comp of comps) {
      console.log(`- ${comp.name} (ID: ${comp.id}, Industry: ${comp.industry_id})`);
    }
  } finally {
    db.destroy();
  }
}
check();
