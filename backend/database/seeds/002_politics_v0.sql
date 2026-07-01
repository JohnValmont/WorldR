BEGIN;

INSERT INTO pol_states (code, name, is_active, country_id, population, registered_voters, base_turnout)
VALUES 
('ironvale', 'Ironvale', TRUE, 'drennia', 2400000, 1600000, 0.58),
('drennport', 'Drennport', FALSE, 'drennia', 0, 0, 0.50),
('westport', 'Westport', FALSE, 'drennia', 0, 0, 0.50),
('greenmere', 'Greenmere', FALSE, 'drennia', 0, 0, 0.50)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    population = EXCLUDED.population,
    registered_voters = EXCLUDED.registered_voters,
    base_turnout = EXCLUDED.base_turnout;

-- Wipe existing NPC parties to be safe on re-runs
DELETE FROM pol_parties WHERE is_npc = TRUE;

INSERT INTO pol_parties (state_id, name, platform, treasury, is_npc, created_arc)
SELECT 
    id, 
    'Ironvale Labour Front', 
    '{"taxation": 30, "labour": 90, "investment": 70, "trade": 50, "stability": 50}'::jsonb, 
    500000.0000, 
    TRUE, 
    0
FROM pol_states WHERE code = 'ironvale';

INSERT INTO pol_parties (state_id, name, platform, treasury, is_npc, created_arc)
SELECT 
    id, 
    'Industrial Progress Party', 
    '{"taxation": 85, "labour": 35, "investment": 75, "trade": 80, "stability": 60}'::jsonb, 
    500000.0000, 
    TRUE, 
    0
FROM pol_states WHERE code = 'ironvale';

INSERT INTO pol_parties (state_id, name, platform, treasury, is_npc, created_arc)
SELECT 
    id, 
    'Civic Stability Union', 
    '{"taxation": 55, "labour": 55, "investment": 60, "trade": 60, "stability": 80}'::jsonb, 
    500000.0000, 
    TRUE, 
    0
FROM pol_states WHERE code = 'ironvale';

INSERT INTO pol_parties (state_id, name, platform, treasury, is_npc, created_arc)
SELECT 
    id, 
    'Independent', 
    '{"taxation": 50, "labour": 50, "investment": 50, "trade": 50, "stability": 50}'::jsonb, 
    50000.0000, 
    TRUE, 
    0
FROM pol_states WHERE code = 'ironvale';

INSERT INTO pol_state_policy (state_id, industry_tax_rate, infrastructure_level, updated_arc)
SELECT id, 0.20, 1, 0 FROM pol_states WHERE code = 'ironvale'
ON CONFLICT (state_id) DO UPDATE SET 
    industry_tax_rate = EXCLUDED.industry_tax_rate,
    infrastructure_level = EXCLUDED.infrastructure_level;

COMMIT;
