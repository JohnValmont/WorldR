-- 0060_fix_equity_placements_and_tick.sql
-- Add min_purchase_shares to equity_placements safely
ALTER TABLE equity_placements
  ADD COLUMN IF NOT EXISTS min_purchase_shares NUMERIC NOT NULL DEFAULT 1;
