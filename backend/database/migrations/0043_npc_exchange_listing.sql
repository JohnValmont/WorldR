-- Migration 0043: NPC Exchange Listing
-- Adds is_exchange_listed flag so NPC companies can appear on the DRX Bourse
-- without needing legal_structure_id = 'public-corporation'.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_exchange_listed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_companies_exchange_listed
  ON companies(is_exchange_listed, status)
  WHERE is_exchange_listed = TRUE AND status = 'active';
