import { db } from './src/config/database'; async function test() { const e = await db.schema.hasTable('pol_party_factions'); console.log('Exists:', e); process.exit(0); } test();
