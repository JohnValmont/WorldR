-- WORLDr Migration: Vehicle Development Status
-- Adds a development lifecycle to manufacturing_vehicle_models.
-- Valid values: 'in_development', 'ready_to_launch', 'launched', 'cancelled'
-- Existing models are backfilled to 'launched' so active production is not disrupted.

ALTER TABLE manufacturing_vehicle_models
  ADD COLUMN IF NOT EXISTS development_status VARCHAR(50) NOT NULL DEFAULT 'in_development';

-- Backfill all existing active models as already launched
UPDATE manufacturing_vehicle_models
  SET development_status = 'launched'
  WHERE status = 'active';
