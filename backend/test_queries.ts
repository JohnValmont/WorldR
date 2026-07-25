import { db } from './src/config/database';

async function run() {
  try {
    const res1 = await db.raw("SELECT * FROM schema_migrations WHERE name = '0023_npc_companies.sql'");
    console.log("=== SCHEMA MIGRATIONS ===");
    console.table(res1.rows);

    const res2 = await db.raw("SELECT id, name, is_npc, npc_personality FROM companies WHERE is_npc = TRUE");
    console.log("=== NPC COMPANIES ===");
    console.table(res2.rows);

  } catch (e) {
    console.error(e);
  } finally {
    await db.destroy();
  }
}

run();
