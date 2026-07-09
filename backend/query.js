const { db } = require('./src/config/database');
db('manufacturing_component_catalogue').select('id', 'name').then(console.log).catch(console.error).finally(() => db.destroy());
