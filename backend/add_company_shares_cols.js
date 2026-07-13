const { db } = require('./dist/src/config/database.js');

async function main() {
  try {
    const hasId = await db.schema.hasColumn('company_shares', 'id');
    if (!hasId) {
      // 1. Drop existing primary key
      await db.raw('ALTER TABLE company_shares DROP CONSTRAINT company_shares_pkey CASCADE;');
      
      // 2. Make holder_character_id nullable
      await db.raw('ALTER TABLE company_shares ALTER COLUMN holder_character_id DROP NOT NULL;');
      
      // 3. Add surrogate primary key
      await db.raw('ALTER TABLE company_shares ADD COLUMN id uuid DEFAULT gen_random_uuid() PRIMARY KEY;');
      
      // 4. Add unique indexes
      await db.raw('CREATE UNIQUE INDEX company_shares_char_idx ON company_shares(company_id, holder_character_id) WHERE holder_character_id IS NOT NULL;');
      await db.raw('CREATE UNIQUE INDEX company_shares_comp_idx ON company_shares(company_id, holder_company_id) WHERE holder_company_id IS NOT NULL;');
      
      // 5. Add a check constraint
      await db.raw('ALTER TABLE company_shares ADD CONSTRAINT chk_holder CHECK ((holder_character_id IS NOT NULL AND holder_company_id IS NULL) OR (holder_character_id IS NULL AND holder_company_id IS NOT NULL));');
      console.log('Successfully altered company_shares pk and constraints');
    } else {
      console.log('company_shares already has id column');
    }
  } catch (err) {
    console.error('Error applying schema changes:', err);
  } finally {
    process.exit(0);
  }
}

main();
