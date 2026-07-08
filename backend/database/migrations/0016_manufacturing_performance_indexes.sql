-- Add indexes to speed up the NPC brain and world tick queries

CREATE INDEX IF NOT EXISTS idx_mfg_sales_results_company_model_date ON manufacturing_sales_results(company_id, vehicle_model_id, world_year, world_month);
CREATE INDEX IF NOT EXISTS idx_mfg_snapshots_company_model_date ON manufacturing_model_snapshots(company_id, model_id, world_year, world_month);
CREATE INDEX IF NOT EXISTS idx_mfg_allocations_company_model ON manufacturing_market_allocations(company_id, vehicle_model_id);
CREATE INDEX IF NOT EXISTS idx_mfg_brand_awareness_company_market ON manufacturing_brand_awareness(company_id, region_market_id);
CREATE INDEX IF NOT EXISTS idx_mfg_inventory_company_model ON manufacturing_inventory(company_id, vehicle_model_id);
CREATE INDEX IF NOT EXISTS idx_mfg_production_lines_company_model ON manufacturing_production_lines(company_id, assigned_vehicle_model_id);
