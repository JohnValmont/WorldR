-- WORLDr Migration 0009: Workforce System
-- Adds detailed month report fields and engineer discount tracking.

-- 1. Extend manufacturing_arc_reports with workforce metrics
ALTER TABLE manufacturing_arc_reports
  ADD COLUMN IF NOT EXISTS planned_units INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS defective_units INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS production_efficiency NUMERIC(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS factory_workers_required INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS factory_workers_available INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supervisor_bonus NUMERIC(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inspector_defect_reduction NUMERIC(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_manager_bonus NUMERIC(5,4) NOT NULL DEFAULT 0;

-- 2. Add engineer development cost discount to vehicle models
ALTER TABLE manufacturing_vehicle_models
  ADD COLUMN IF NOT EXISTS development_cost_discount NUMERIC(5,4) NOT NULL DEFAULT 0;
