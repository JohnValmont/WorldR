import { db, runMigrationsAndSeeds } from '../src/config/database';

async function resetDb() {
  try {
    console.log('Dropping public schema...');
    await db.raw('DROP SCHEMA public CASCADE;');
    console.log('Recreating public schema...');
    await db.raw('CREATE SCHEMA public;');
    await db.raw('GRANT ALL ON SCHEMA public TO postgres;');
    await db.raw('GRANT ALL ON SCHEMA public TO public;');
    
    console.log('Running migrations and seeds...');
    await runMigrationsAndSeeds();
    
    console.log('✅ Database successfully reset and seeded!');
  } catch (err) {
    console.error('❌ Error resetting database:', err);
  } finally {
    await db.destroy();
  }
}

resetDb();
