const knex = require('knex');
const db = knex({
  client: 'sqlite3',
  connection: { filename: './db.sqlite' },
  useNullAsDefault: true
});

async function run() {
  const prices = await db.raw(`
    SELECT c.name, 
           (SELECT close_price FROM share_price_history WHERE company_id = c.id ORDER BY game_year DESC, game_month DESC LIMIT 1) as price 
    FROM companies c 
    WHERE c.is_npc = true AND c.is_exchange_listed = true
  `);
  console.table(prices);
  process.exit(0);
}
run();
