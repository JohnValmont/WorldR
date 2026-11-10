-- 0093_repair_npc_car_market.sql
--
-- One-time repair after fixing two NPC bugs in npcBrain.service.ts:
--  1. "New variant every 2 months, +5% build cost each time": over ~30 game
--     years build costs compounded ~20x and, because NPC prices live between
--     1.05x and 2.5x build cost, prices followed (~$421,000 for a car that
--     launched at $13,500).
--  2. Industrial espionage replaced each NPC's own car with a copy of the top
--     player car every month, so all NPCs drifted onto the same car outside
--     their own segment.
-- Result on live: ~84 car sales/month against ~10,000 buyers/month of demand.
--
-- What this does, ONLY for companies that are still NPC-run (is_npc = true):
--   * restores each NPC's newest active model to its own roster car
--     (segment, build, scores, build cost, price) when that model is inflated
--     (cost > 1.5x roster) or outside the NPC's segment;
--     values mirror NPC_ROSTER in backend/src/api/constants/npc.ts and
--     spawnNpc's rules (cost = salePrice * 0.55, vehicle_class by platform);
--   * gives it a clean "<Company> Standard <N>" name (first free numeral);
--   * discontinues any other inflated/off-segment active models of that NPC;
--   * clears the NPC zero-demand streak memory.
-- Also adds manufacturing_vehicle_models.npc_cloned_from_model_id, used by the
-- new espionage cooldown.
-- Player-owned companies (including former NPCs bought by players) are never touched.
-- Idempotent: repaired models match their roster, so a re-run changes nothing.

BEGIN;

ALTER TABLE manufacturing_vehicle_models
  ADD COLUMN IF NOT EXISTS npc_cloned_from_model_id UUID;

CREATE TEMP TABLE _npc_roster (
  personality VARCHAR(50), company_name VARCHAR(100), segment VARCHAR(50), vehicle_class VARCHAR(50),
  platform VARCHAR(50), power_unit VARCHAR(50), drivetrain VARCHAR(50), interior VARCHAR(50), safety_tier VARCHAR(50),
  sale_price NUMERIC, build_cost NUMERIC,
  reliability INT, performance INT, fuel_efficiency INT, appeal INT, cargo INT, safety INT
) ON COMMIT DROP;

INSERT INTO _npc_roster VALUES
  ('valuecorp', 'Valuecorp',       'Budget',      'Compact Car', 'economy',    'small-i4',    'fwd', 'basic',   'standard', 13500,  7425, 75, 40, 85, 50, 50, 55),
  ('veridian',  'Veridian Motors', 'Family',      'Sedan',       'standard',   'standard-i4', 'fwd', 'comfort', 'enhanced', 24500, 13475, 80, 50, 65, 65, 70, 85),
  ('apex',      'Apex Automobili', 'Performance', 'Sedan',       'standard',   'v6',          'awd', 'premium', 'advanced', 54000, 29700, 65, 95, 35, 90, 35, 75),
  ('haulpro',   'HaulPro',         'Commercial',  'Utility Van', 'heavy-duty', 'standard-i4', 'rwd', 'basic',   'enhanced', 31000, 17050, 85, 45, 60, 40, 95, 70);

-- Every active NPC model that needs repair, newest first per company.
CREATE TEMP TABLE _npc_broken ON COMMIT DROP AS
SELECT m.id AS model_id, m.company_id, m.world_instance_id, r.*,
       ROW_NUMBER() OVER (PARTITION BY m.company_id ORDER BY m.created_at_world_year DESC, m.created_at_world_month DESC, m.created_at DESC) AS rn
FROM manufacturing_vehicle_models m
JOIN companies c ON c.id = m.company_id
JOIN _npc_roster r ON (c.npc_personality = r.personality OR c.name = r.company_name)
WHERE c.is_npc = true
  AND m.status = 'active'
  AND (m.manufacturing_cost_per_unit > r.build_cost * 1.5
       OR LOWER(COALESCE(m.target_segment, '')) <> LOWER(r.segment));

-- Clean, unused name per repaired model: "<Company> Standard II", "... III", ...
CREATE TEMP TABLE _npc_names ON COMMIT DROP AS
SELECT DISTINCT ON (b.model_id) b.model_id, b.company_name || ' Standard ' || g.numeral AS new_name
FROM _npc_broken b
CROSS JOIN (VALUES (2,'II'),(3,'III'),(4,'IV'),(5,'V'),(6,'VI'),(7,'VII'),(8,'VIII'),(9,'IX'),(10,'X'),
                   (11,'XI'),(12,'XII'),(13,'XIII'),(14,'XIV'),(15,'XV'),(16,'XVI'),(17,'XVII'),(18,'XVIII'),(19,'XIX'),(20,'XX')) AS g(n, numeral)
WHERE b.rn = 1
  AND NOT EXISTS (
    SELECT 1 FROM manufacturing_vehicle_models o
    WHERE o.world_instance_id = b.world_instance_id
      AND o.name = b.company_name || ' Standard ' || g.numeral
  )
ORDER BY b.model_id, g.n;

UPDATE manufacturing_vehicle_models m
SET target_segment              = b.segment,
    vehicle_class               = b.vehicle_class,
    platform_type               = b.platform,
    power_unit_type             = b.power_unit,
    drivetrain_type             = b.drivetrain,
    interior_tier               = b.interior,
    safety_tier                 = b.safety_tier,
    manufacturing_cost_per_unit = b.build_cost,
    sale_price                  = b.sale_price,
    reliability_score           = b.reliability,
    performance_score           = b.performance,
    fuel_efficiency_score       = b.fuel_efficiency,
    appeal_score                = b.appeal,
    cargo_score                 = b.cargo,
    safety_score                = b.safety,
    name                        = COALESCE(n.new_name, m.name),
    npc_cloned_from_model_id    = NULL,
    updated_at                  = NOW()
FROM _npc_broken b
LEFT JOIN _npc_names n ON n.model_id = b.model_id
WHERE m.id = b.model_id AND b.rn = 1;

-- Any other broken active models of the same NPC: retire them (same as a facelift would).
UPDATE manufacturing_vehicle_models m
SET status = 'discontinued', development_status = 'discontinued', updated_at = NOW()
FROM _npc_broken b
WHERE m.id = b.model_id AND b.rn > 1;

UPDATE manufacturing_market_allocations a
SET units_allocated = 0, updated_at = NOW()
FROM _npc_broken b
WHERE a.vehicle_model_id = b.model_id AND b.rn > 1;

UPDATE manufacturing_npc_state s
SET zero_demand_streak = 0, updated_at = NOW()
WHERE s.company_id IN (SELECT DISTINCT company_id FROM _npc_broken);

COMMIT;
