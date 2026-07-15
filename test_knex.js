const knex = require('knex');
const db = knex({ client: 'pg', connection: 'postgres://postgres:postgres@localhost:5432/worldr_db' });
db('manufacturing_factories')
  .join('companies', 'manufacturing_factories.company_id', 'companies.id')
  .select('manufacturing_factories.*', 'companies.world_instance_id')
  .limit(1)
  .then(res => {
     if (res.length > 0) {
        console.log("Returned ID:", res[0].id);
        console.log("Company ID:", res[0].company_id);
     } else console.log("no data");
  })
  .finally(() => db.destroy());
