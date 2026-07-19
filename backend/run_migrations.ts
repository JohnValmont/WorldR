import { runMigrationsAndSeeds } from './src/config/database';

async function main() {
  console.log('Running migrations...');
  await runMigrationsAndSeeds();
  console.log('Done.');
  process.exit(0);
}

main().catch(console.error);
