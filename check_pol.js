const knex = require('knex');
const db = knex({ client: 'pg', connection: 'postgres://postgres:postgres@localhost:5432/worldr_db' });
db('pol_states').select('*')
  .then(res => {
     console.log(res);
  })
  .finally(() => db.destroy());
