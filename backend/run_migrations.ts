import { runMigrationsAndSeeds } from './src/config/database';

async function run() {
  try {
    await runMigrationsAndSeeds();
    console.log("Migrations applied successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}
run();
