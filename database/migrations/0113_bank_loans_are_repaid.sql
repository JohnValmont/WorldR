-- Bank loans are real loans: the economy tick now collects a monthly payment.
--
-- 1. Personal loans and personal credit ratings. backend/database/migrations/0052
--    defined these tables with an INTEGER character_id, but characters.id is a
--    UUID, so they were never created and taking a personal loan failed AFTER the
--    cash had been credited. Create them with the right types. A copy with a
--    non-UUID character_id cannot hold a valid row, so it is replaced.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'character_debt_facilities' AND column_name = 'character_id' AND data_type <> 'uuid') THEN
    DROP TABLE character_debt_facilities;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'character_credit_ratings' AND column_name = 'character_id' AND data_type <> 'uuid') THEN
    DROP TABLE character_credit_ratings;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS character_debt_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    bank_id VARCHAR(50),
    facility_type VARCHAR(50) NOT NULL DEFAULT 'personal',
    principal_amount NUMERIC NOT NULL DEFAULT 0,
    remaining_principal NUMERIC NOT NULL DEFAULT 0,
    interest_rate NUMERIC NOT NULL DEFAULT 0,
    term_months INTEGER NOT NULL DEFAULT 0,
    months_remaining INTEGER NOT NULL DEFAULT 0,
    monthly_payment NUMERIC NOT NULL DEFAULT 0,
    missed_payments INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE character_debt_facilities ADD COLUMN IF NOT EXISTS remaining_principal NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE character_debt_facilities ADD COLUMN IF NOT EXISTS missed_payments INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_character_debt_facilities_character ON character_debt_facilities (character_id, status);

CREATE TABLE IF NOT EXISTS character_credit_ratings (
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    world_year INTEGER NOT NULL,
    world_month INTEGER NOT NULL,
    rating_tier VARCHAR(5),
    risk_score NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (character_id, world_year, world_month)
);

-- 2. Company loans keep their term and missed payments. Loans taken before this
--    change have no term (months_remaining NULL): they are repaid at their
--    monthly payment until the principal is gone.
ALTER TABLE banking_active_loans ADD COLUMN IF NOT EXISTS term_months INTEGER;
ALTER TABLE banking_active_loans ADD COLUMN IF NOT EXISTS months_remaining INTEGER;
ALTER TABLE banking_active_loans ADD COLUMN IF NOT EXISTS missed_payments INTEGER NOT NULL DEFAULT 0;
ALTER TABLE banking_active_loans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_banking_active_loans_borrower ON banking_active_loans (borrower_id, status);
