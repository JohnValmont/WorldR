import { runMigrationsAndSeeds } from './src/config/database';

runMigrationsAndSeeds().then(() => {
  console.log('Migrations complete');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
