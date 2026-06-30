-- Adds a reason_code to manufacturing_sales_results to enable NPC brain decisions and player transparency
ALTER TABLE manufacturing_sales_results ADD COLUMN IF NOT EXISTS reason_code VARCHAR(60);
