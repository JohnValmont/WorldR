import { db } from './src/config/database';
db('schema_migrations').select('*').then(console.log).catch(console.error).finally(() => db.destroy());
