import { db } from './src/config/database';

async function main() {
  try {
    await db.raw(`
      CREATE OR REPLACE FUNCTION test_search_path_func()
      RETURNS TRIGGER AS $$
      BEGIN
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SET search_path = public;
    `);
    console.log('Successfully created test function with search_path');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
main();
