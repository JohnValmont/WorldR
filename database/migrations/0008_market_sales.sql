-- WORLDr Migration 0008: Market & Sales System
-- Adds inventory allocation, brand awareness, and enriches market data.

-- 1. Add market config columns to existing manufacturing_region_markets
ALTER TABLE manufacturing_region_markets
  ADD COLUMN IF NOT EXISTS competition_level VARCHAR(50) NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS market_tier VARCHAR(50) NOT NULL DEFAULT 'mid',
  ADD COLUMN IF NOT EXISTS distribution_strength NUMERIC(4,2) NOT NULL DEFAULT 0.70;

-- 2. MANUFACTURING MARKET ALLOCATIONS
-- One record per company + vehicle_model + region_market.
-- Tracks how many units are allocated to each market and the marketing tier.
CREATE TABLE IF NOT EXISTS manufacturing_market_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_model_id UUID NOT NULL REFERENCES manufacturing_vehicle_models(id) ON DELETE CASCADE,
    region_market_id VARCHAR(100) NOT NULL REFERENCES manufacturing_region_markets(id) ON DELETE RESTRICT,
    units_allocated INT NOT NULL DEFAULT 0,
    marketing_tier VARCHAR(50) NOT NULL DEFAULT 'none',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_market_allocation UNIQUE (company_id, vehicle_model_id, region_market_id)
);
CREATE INDEX IF NOT EXISTS idx_mkt_alloc_company_id ON manufacturing_market_allocations(company_id);
CREATE INDEX IF NOT EXISTS idx_mkt_alloc_model_id ON manufacturing_market_allocations(vehicle_model_id);
ALTER TABLE manufacturing_market_allocations ENABLE ROW LEVEL SECURITY;

-- 3. MANUFACTURING BRAND AWARENESS
-- Company-level brand awareness per market (awareness 0-100, reputation 0-100).
CREATE TABLE IF NOT EXISTS manufacturing_brand_awareness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    region_market_id VARCHAR(100) NOT NULL REFERENCES manufacturing_region_markets(id) ON DELETE RESTRICT,
    awareness INT NOT NULL DEFAULT 0,
    reputation INT NOT NULL DEFAULT 50,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_brand_awareness UNIQUE (company_id, region_market_id)
);
CREATE INDEX IF NOT EXISTS idx_brand_awareness_company_id ON manufacturing_brand_awareness(company_id);
ALTER TABLE manufacturing_brand_awareness ENABLE ROW LEVEL SECURITY;

-- 4. Add marketing_costs column to arc reports if not exists
ALTER TABLE manufacturing_arc_reports
  ADD COLUMN IF NOT EXISTS marketing_costs NUMERIC(19,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_revenue NUMERIC(19,4) NOT NULL DEFAULT 0;
