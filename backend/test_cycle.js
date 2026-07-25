const db = require('knex')({
  client: 'pg',
  connection: 'postgresql://postgres:postgres@localhost:5432/worldr_db'
});
const { getOrCreateCurrentCycle } = require('./src/api/services/politics.service');

(async () => {
  try {
    const cycle = await getOrCreateCurrentCycle('3959caca-1bf7-4e84-8d37-7b55d0d809b3');
    console.log(cycle);
  } catch (e) {
    console.error(e);
  } finally {
    db.destroy();
  }
})();
