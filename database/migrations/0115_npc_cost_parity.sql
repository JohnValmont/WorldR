-- 0115_npc_cost_parity.sql
--
-- Rival car makers (NPCs) pay what a player in their seat would pay, and sell
-- only in their own nation. Model and numbers: Nov 2026 NPC rebalance (NPCs were
-- earning $4.6M-$18.5M/month on ~50% margins while a player was near break-even).
--
-- 1. Staff job names. Seed 0004 wrote 'factory_worker', 'supervisor',
--    'sales_manager', 'engineer', 'inspector', but the wage table (STAFF_ROLES in
--    backend/src/api/constants/manufacturing.ts) uses 'factory-worker',
--    'production-supervisor', ... so no wage was found and NPCs paid $0 wages.
--    Seed 0006 copied the same rows to every Westmark/Eryndor rival. Renamed for
--    every company (no player row uses the old spellings).
-- 2. Factory. NPCs ran a 'small-workshop' (30 workers, $25k lease) with its
--    capacity overwritten to 500. They now run the real 500-car factory type
--    (NPC_FACTORY_TYPE_ID = 'medium-plant' in backend/src/api/constants/npc.ts):
--    its lease, capacity and worker requirement, with auto condition recovery on
--    (the same option players have), and they employ that many workers.
-- 3. Own nation only. B7 market expansion used to pick markets from any nation;
--    those allocations are removed (the brain now only expands at home). A
--    market an NPC has an allocation row in still receives stock, so the rows
--    are deleted, not zeroed.
--
-- Player companies are not touched except for (1). Idempotent: a re-run
-- changes nothing.

-- company_staff is UNIQUE(company_id, role): where a company already has the
-- correct spelling, the old row's people are added to it and the old row removed.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM (VALUES
      ('factory_worker', 'factory-worker'),
      ('supervisor',     'production-supervisor'),
      ('sales_manager',  'sales-manager'),
      ('engineer',       'automotive-engineer'),
      ('inspector',      'quality-inspector')) AS t(old_role, new_role)
  LOOP
    UPDATE company_staff n
    SET quantity = n.quantity + o.quantity, updated_at = NOW()
    FROM company_staff o
    WHERE o.company_id = n.company_id AND o.role = r.old_role AND n.role = r.new_role;

    DELETE FROM company_staff o
    WHERE o.role = r.old_role
      AND EXISTS (SELECT 1 FROM company_staff n WHERE n.company_id = o.company_id AND n.role = r.new_role);

    UPDATE company_staff SET role = r.new_role, updated_at = NOW() WHERE role = r.old_role;
  END LOOP;
END $$;

UPDATE manufacturing_factories f
SET factory_type_id            = ft.id,
    capacity_per_month         = ft.base_capacity_per_month,
    lease_cost_per_month       = ft.base_lease_cost_per_month,
    maintenance_cost_per_month = ft.base_maintenance_per_month,
    worker_capacity            = ft.worker_requirement,
    auto_condition_recovery    = TRUE,
    updated_at                 = NOW()
FROM companies c, manufacturing_factory_types ft
WHERE c.id = f.company_id
  AND c.is_npc = TRUE
  AND ft.id = 'medium-plant'
  AND (f.factory_type_id <> ft.id
       OR f.capacity_per_month <> ft.base_capacity_per_month
       OR f.lease_cost_per_month <> ft.base_lease_cost_per_month
       OR f.worker_capacity IS DISTINCT FROM ft.worker_requirement
       OR f.auto_condition_recovery IS DISTINCT FROM TRUE);

-- Enough workers for the factory.
UPDATE company_staff s
SET quantity = ft.worker_requirement, updated_at = NOW()
FROM companies c, manufacturing_factory_types ft
WHERE c.id = s.company_id
  AND c.is_npc = TRUE
  AND ft.id = 'medium-plant'
  AND s.role = 'factory-worker'
  AND s.quantity < ft.worker_requirement;

INSERT INTO company_staff (company_id, role, quantity)
SELECT c.id, 'factory-worker', ft.worker_requirement
FROM companies c
JOIN manufacturing_factory_types ft ON ft.id = 'medium-plant'
WHERE c.is_npc = TRUE
  AND c.industry_id = 'manufacturing'
  AND NOT EXISTS (SELECT 1 FROM company_staff s WHERE s.company_id = c.id AND s.role = 'factory-worker');

DELETE FROM manufacturing_market_allocations a
USING companies c, manufacturing_region_markets rm
WHERE c.id = a.company_id
  AND rm.id = a.region_market_id
  AND c.is_npc = TRUE
  AND rm.country_id <> c.country_id;
