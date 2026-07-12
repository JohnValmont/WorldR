-- Migration 0023: NPC Exchange Listing
-- Adds is_exchange_listed flag to companies table so NPC corps can be listed
-- on the DRX Bourse without needing to be legal_structure_id = 'public-corporation'.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_exchange_listed BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for listing queries
CREATE INDEX IF NOT EXISTS idx_companies_exchange_listed ON companies(is_exchange_listed, status)
  WHERE is_exchange_listed = TRUE AND status = 'active';
