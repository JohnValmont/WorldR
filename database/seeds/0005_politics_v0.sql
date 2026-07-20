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

INSERT INTO pol_state_policy (state_id, active_policies, updated_arc)
SELECT id, '{"taxation": "standard", "labor": "regulated", "environment": "standard", "welfare": "standard"}'::jsonb, 0 FROM pol_states WHERE code = 'ironvale'
ON CONFLICT (state_id) DO UPDATE SET 
    active_policies = EXCLUDED.active_policies;

INSERT INTO pol_party_identities (party_id, color, monogram, leader, motto, blurb)
SELECT id, '#A33A3A', 'LF', 'Councillor Sera Dunne', 'The floor of the factory is the floor of the Council.', 'Worker bloc — labour protection, industrial investment, low tax.'
FROM pol_parties WHERE name = 'Ironvale Labour Front';

INSERT INTO pol_party_identities (party_id, color, monogram, leader, motto, blurb)
SELECT id, '#B0863E', 'IP', 'Marcus Vell', 'Let Ironvale build — and get out of its way.', 'Owners & exporters — pro-business, open trade, light regulation.'
FROM pol_parties WHERE name = 'Industrial Progress Party';

INSERT INTO pol_party_identities (party_id, color, monogram, leader, motto, blurb)
SELECT id, '#4A6178', 'CS', 'Adele Renner', 'Order first. Prosperity follows.', 'Professionals & families — institutional order and steady growth.'
FROM pol_parties WHERE name = 'Civic Stability Union';

INSERT INTO pol_party_identities (party_id, color, monogram, leader, motto, blurb)
SELECT id, '#6C7A89', 'IN', 'Independent', 'A new voice in the Ironvale Council.', 'Player-founded party.'
FROM pol_parties WHERE name = 'Independent';

COMMIT;
