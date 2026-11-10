-- 0094_vehicle_design_style.sql
-- Visual identity for each car from the Car Designer: paint, accent colour,
-- body style, wheels and an optional tagline. VISUAL ONLY: it never affects
-- scores, cost or demand (see backend/src/api/constants/carStyle.ts).
-- NULL for older models; the UI falls back to a default look.

ALTER TABLE manufacturing_vehicle_models
  ADD COLUMN IF NOT EXISTS design_style JSONB;
