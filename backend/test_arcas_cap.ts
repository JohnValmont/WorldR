import { db } from './src/config/database'; async function test() { const c = await db('companies'); console.log('Companies:', c.map(x => x.name)); process.exit(0); } test();
