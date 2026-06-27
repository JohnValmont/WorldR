-- WORLDr Migration 0021: Engineering Engine Consequences (Phase 3B)
-- Adds storage for permanent engineering assessments and deterministic validation results

ALTER TABLE manufacturing_vehicle_models
  ADD COLUMN IF NOT EXISTS prototype_validation_result JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS engineering_assessment JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS engineering_balance_rating VARCHAR(10) DEFAULT NULL;
