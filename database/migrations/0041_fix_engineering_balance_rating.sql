-- WORLDr Migration 0041: Fix Engineering Balance Rating Length
-- Expands engineering_balance_rating to TEXT to safely store long balance flags.

ALTER TABLE manufacturing_vehicle_models
  ALTER COLUMN engineering_balance_rating TYPE TEXT;
