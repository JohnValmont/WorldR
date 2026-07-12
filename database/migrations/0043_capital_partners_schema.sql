-- Replace primary key with UUID for company_shares safely first, before dropping NOT NULL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='company_shares' AND column_name='id'
    ) THEN
        ALTER TABLE company_shares DROP CONSTRAINT IF EXISTS company_shares_pkey CASCADE;
        ALTER TABLE company_shares ADD COLUMN id uuid DEFAULT gen_random_uuid() PRIMARY KEY;
    END IF;
END $$;

-- Add holder_company_id to company_shares
ALTER TABLE company_shares ADD COLUMN IF NOT EXISTS holder_company_id uuid REFERENCES companies(id);

-- Now we can drop NOT NULL from holder_character_id in company_shares safely
ALTER TABLE company_shares ALTER COLUMN holder_character_id DROP NOT NULL;

-- Create unique indexes for company_shares
CREATE UNIQUE INDEX IF NOT EXISTS company_shares_char_idx ON company_shares(company_id, holder_character_id) WHERE holder_character_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS company_shares_comp_idx ON company_shares(company_id, holder_company_id) WHERE holder_company_id IS NOT NULL;

-- Add CHECK constraint for company_shares
ALTER TABLE company_shares DROP CONSTRAINT IF EXISTS chk_holder;
ALTER TABLE company_shares ADD CONSTRAINT chk_holder CHECK ((holder_character_id IS NOT NULL AND holder_company_id IS NULL) OR (holder_character_id IS NULL AND holder_company_id IS NOT NULL));

-- Add purchaser_company_id to share_orders
ALTER TABLE share_orders ADD COLUMN IF NOT EXISTS purchaser_company_id uuid REFERENCES companies(id);

-- For dividend_payments, check if it has a primary key on holder_character_id
-- We should drop its primary key if it has one that includes holder_character_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'dividend_payments'::regclass AND contype = 'p'
    ) THEN
        ALTER TABLE dividend_payments DROP CONSTRAINT IF EXISTS dividend_payments_pkey CASCADE;
    END IF;
END $$;

-- Add holder_company_id to dividend_payments
ALTER TABLE dividend_payments ADD COLUMN IF NOT EXISTS holder_company_id uuid REFERENCES companies(id);

-- Drop NOT NULL from holder_character_id in dividend_payments
ALTER TABLE dividend_payments ALTER COLUMN holder_character_id DROP NOT NULL;

-- Add CHECK constraint for dividend_payments
ALTER TABLE dividend_payments DROP CONSTRAINT IF EXISTS chk_div_holder;
ALTER TABLE dividend_payments ADD CONSTRAINT chk_div_holder CHECK ((holder_character_id IS NOT NULL AND holder_company_id IS NULL) OR (holder_character_id IS NULL AND holder_company_id IS NOT NULL));
