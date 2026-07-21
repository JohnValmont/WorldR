import { db } from './src/config/database'; async function test() { const m = await db('schema_migrations').select('*'); console.log(m.map(x => x.filename)); process.exit(0); } test();
