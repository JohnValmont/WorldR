import { runMigrationsAndSeeds } from './src/config/database';

async function test() {
  try {
    await runMigrationsAndSeeds();
    console.log("Migrations SUCCESS");
  } catch (err) {
    console.error("Migrations FAILED:", err);
  }
  process.exit(0);
}

test();
