-- Migration 0055: Backfill Land Plots and Licenses for existing companies

BEGIN;

-- 1. Auto-grant HQ state licenses to all active companies
INSERT INTO company_state_licenses (company_id, state_id, status)
SELECT id, headquarters_state_id, 'active'
FROM companies
WHERE headquarters_state_id IS NOT NULL
ON CONFLICT (company_id, state_id) DO NOTHING;

-- 2. Create a default Land Plot in the HQ state for each company that has factories but no land plots
INSERT INTO manufacturing_land_plots (world_instance_id, company_id, state_id, name, total_acres, used_acres, purchase_price)
SELECT DISTINCT
    c.world_instance_id,
    c.id as company_id,
    c.headquarters_state_id as state_id,
    c.name || ' HQ Campus' as name,
    10 as total_acres,
    1 as used_acres,
    0 as purchase_price
FROM companies c
JOIN manufacturing_factories f ON f.company_id = c.id
WHERE f.land_plot_id IS NULL
ON CONFLICT DO NOTHING;

-- 3. Link existing factories to the newly created land plots
UPDATE manufacturing_factories f
SET 
    land_plot_id = p.id,
    ownership_type = 'owned',
    building_status = 'completed',
    lease_cost_per_month = 0
FROM manufacturing_land_plots p
WHERE f.company_id = p.company_id 
AND f.state_id = p.state_id 
AND f.land_plot_id IS NULL;

COMMIT;
