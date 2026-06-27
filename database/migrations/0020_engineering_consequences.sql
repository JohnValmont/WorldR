-- WORLDr Migration 0020: Engineering Consequences (Phase 3B)
-- Adds warranty reserve, engineering culture score, and arc report engineering notes.

-- 1. Warranty reserve percentage on vehicle models (computed at launch, drives per-arc deductions)
ALTER TABLE manufacturing_vehicle_models
  ADD COLUMN IF NOT EXISTS warranty_reserve_pct NUMERIC(5,4) NOT NULL DEFAULT 0;

-- 2. Engineering culture score on reputation table (accumulates from prototype validations)
ALTER TABLE manufacturing_engineering_reputation
  ADD COLUMN IF NOT EXISTS engineering_culture_score INT NOT NULL DEFAULT 0;

-- 3. Arc report columns for engineering production contributions
ALTER TABLE manufacturing_arc_reports
  ADD COLUMN IF NOT EXISTS warranty_reserve_cost NUMERIC(19,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engineering_production_notes TEXT DEFAULT NULL;

-- 4. Back-fill warranty_reserve_pct for existing models from their stored reliability_score
-- Formula: max(0, (75 - reliability_score) / 100 * 0.02)
UPDATE manufacturing_vehicle_models
  SET warranty_reserve_pct = GREATEST(0, (75 - COALESCE(reliability_score, 60)) / 100.0 * 0.02)
  WHERE warranty_reserve_pct = 0;