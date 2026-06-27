-- WORLDr Migration 0011: Factory Expansion
-- Adds workshop expansion tracking to manufacturing_factories.

-- 1. Expansion state columns on the factory row
ALTER TABLE manufacturing_factories
  ADD COLUMN IF NOT EXISTS expansion_status VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expansion_started_orbit INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expansion_started_arc INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expansion_completion_orbit INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expansion_completion_arc INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expansion_cost NUMERIC(19,4) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS worker_capacity INT DEFAULT NULL;

-- 2. Optional note column on arc reports for expansion events
ALTER TABLE manufacturing_arc_reports
  ADD COLUMN IF NOT EXISTS factory_expansion_note TEXT DEFAULT NULL;

-- 3. Backfill: set worker_capacity to worker_requirement from factory type for existing factories
UPDATE manufacturing_factories f
SET worker_capacity = ft.worker_requirement
FROM manufacturing_factory_types ft
WHERE f.factory_type_id = ft.id
  AND f.worker_capacity IS NULL;
