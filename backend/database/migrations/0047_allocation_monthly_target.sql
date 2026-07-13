-- Migration 0047: Add monthly_target to manufacturing_market_allocations
-- This column stores the player's standing monthly intent (how many units to sell
-- per month in each market). units_allocated is now reset to monthly_target each
-- arc and then capped by available inventory (Layer 1 proportional cap).

ALTER TABLE manufacturing_market_allocations
  ADD COLUMN IF NOT EXISTS monthly_target INTEGER NOT NULL DEFAULT 0;

-- Seed from existing units_allocated so current player settings are preserved
UPDATE manufacturing_market_allocations
  SET monthly_target = units_allocated
  WHERE monthly_target = 0 AND units_allocated > 0;
