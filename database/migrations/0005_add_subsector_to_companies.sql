-- WORLDr Database Migration: Add subsector to companies

ALTER TABLE companies ADD COLUMN IF NOT EXISTS subsector_id VARCHAR(100);
