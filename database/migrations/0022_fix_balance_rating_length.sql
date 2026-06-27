-- WORLDr Migration 0022: Fix Balance Rating Length
-- Expands engineering_balance_rating to safely store long rating strings.

ALTER TABLE manufacturing_vehicle_models
  ALTER COLUMN engineering_balance_rating TYPE VARCHAR(100);
