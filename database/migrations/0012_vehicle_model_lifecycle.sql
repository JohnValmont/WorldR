-- WORLDr Migration 0012: Vehicle Model Lifecycle
-- Adds: development_type, facelift relationship, launch/discontinue month tracking
-- Creates: manufacturing_model_snapshots table for per-model per-month performance

-- 1. Add lifecycle columns to manufacturing_vehicle_models
ALTER TABLE manufacturing_vehicle_models
  ADD COLUMN IF NOT EXISTS development_type VARCHAR(20) NOT NULL DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS facelift_source_model_id UUID REFERENCES manufacturing_vehicle_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS launched_year INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS launched_month INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discontinued_year INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discontinued_month INT DEFAULT NULL;

-- Backfill: existing launched models get development_type = 'original'
UPDATE manufacturing_vehicle_models
  SET development_type = 'original'
  WHERE development_type IS NULL OR development_type = '';

-- 2. Model performance snapshots (one record per company + model + month)
CREATE TABLE IF NOT EXISTS manufacturing_model_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES manufacturing_vehicle_models(id) ON DELETE CASCADE,
    world_year INT NOT NULL,
    world_month INT NOT NULL,
    units_produced INT NOT NULL DEFAULT 0,
    defective_units INT NOT NULL DEFAULT 0,
    units_sold INT NOT NULL DEFAULT 0,
    ending_inventory INT NOT NULL DEFAULT 0,
    sales_revenue NUMERIC(19,4) NOT NULL DEFAULT 0,
    production_cost NUMERIC(19,4) NOT NULL DEFAULT 0,
    defect_loss NUMERIC(19,4) NOT NULL DEFAULT 0,
    marketing_cost NUMERIC(19,4) NOT NULL DEFAULT 0,
    storage_cost NUMERIC(19,4) NOT NULL DEFAULT 0,
    direct_contribution NUMERIC(19,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_model_snapshot UNIQUE (company_id, model_id, world_year, world_month)
);

CREATE INDEX IF NOT EXISTS idx_model_snapshots_company_id ON manufacturing_model_snapshots(company_id);
CREATE INDEX IF NOT EXISTS idx_model_snapshots_model_id ON manufacturing_model_snapshots(model_id);
ALTER TABLE manufacturing_model_snapshots ENABLE ROW LEVEL SECURITY;
