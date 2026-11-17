-- 0099_starter_nations.sql
-- Starter nations two and three: Westmark and Eryndor (docs/POLITICS_FLOOR.md).
-- Each is the same size as Drennia: 151 seats, 7,000,000 voters, the same
-- starting statistics (column defaults) and laws. Districts are synced from
-- backend/src/api/constants/nations.ts by the first politics month.
-- Idempotent: every statement only adds what is missing.

INSERT INTO countries (id, world_instance_id, name, currency_id, status)
SELECT v.id, w.id, v.name, 'dollar', 'active'
FROM (VALUES ('westmark', 'Free Ports of Westmark'), ('eryndor', 'Commonwealth of Eryndor')) AS v(id, name)
CROSS JOIN (SELECT id FROM world_instances ORDER BY (status = 'active') DESC LIMIT 1) w
ON CONFLICT DO NOTHING;

INSERT INTO pol_states (code, name, is_active, country_id, population, registered_voters, base_turnout)
VALUES
  ('westmark', 'Assembly of the Ports', TRUE, 'westmark', 10000000, 7000000, 0.60),
  ('eryndor',  'Diet of Eryndor',       TRUE, 'eryndor',  10000000, 7000000, 0.60)
ON CONFLICT (code) DO NOTHING;

-- Four computer-run parties each, with the same spread of views as Drennia's
-- (a workers' party, a business party, a party of order, and independents).
INSERT INTO pol_parties (state_id, name, abbreviation, platform, treasury, is_npc, created_arc)
SELECT s.id, v.name, v.abbr, v.platform::jsonb, v.treasury, TRUE, 0
FROM pol_states s
JOIN (VALUES
  ('westmark', 'Harbour Workers'' League', 'HWL', '{"taxation": 30, "labour": 88, "investment": 70, "trade": 60, "stability": 45}', 500000.0000),
  ('westmark', 'Free Trade Alliance',      'FTA', '{"taxation": 85, "labour": 30, "investment": 65, "trade": 90, "stability": 55}', 500000.0000),
  ('westmark', 'Guildhall Union',          'GHU', '{"taxation": 55, "labour": 50, "investment": 60, "trade": 65, "stability": 80}', 500000.0000),
  ('westmark', 'Coastal Independents',     'CIN', '{"taxation": 50, "labour": 50, "investment": 50, "trade": 50, "stability": 50}',  50000.0000),
  ('eryndor',  'Miners'' and Smallholders'' Front', 'MSF', '{"taxation": 30, "labour": 86, "investment": 75, "trade": 38, "stability": 50}', 500000.0000),
  ('eryndor',  'Eryndor Enterprise Party', 'EEP', '{"taxation": 85, "labour": 35, "investment": 70, "trade": 75, "stability": 60}', 500000.0000),
  ('eryndor',  'Homestead Union',          'HSU', '{"taxation": 55, "labour": 55, "investment": 55, "trade": 45, "stability": 82}', 500000.0000),
  ('eryndor',  'Highland Independents',    'HIN', '{"taxation": 50, "labour": 50, "investment": 50, "trade": 50, "stability": 50}',  50000.0000)
) AS v(code, name, abbr, platform, treasury) ON v.code = s.code
WHERE NOT EXISTS (SELECT 1 FROM pol_parties p WHERE p.state_id = s.id AND p.name = v.name);

INSERT INTO pol_party_identities (party_id, color, monogram, leader, motto, blurb)
SELECT p.id, v.color, v.mono, v.leader, v.motto, v.blurb
FROM pol_parties p
JOIN (VALUES
  ('Harbour Workers'' League', '#C0473D', 'HW', 'Tamsin Reeve',   'Every cargo is carried on somebody''s back.',  'Dockers'' and shipwrights'' party: strong unions, public works, taxes on the shipping houses.'),
  ('Free Trade Alliance',      '#D4A537', 'FT', 'Lucan Arkwright', 'Open the harbour and the money follows.',      'Merchants'' party: low duties, low taxes, no one between a trader and a customer.'),
  ('Guildhall Union',          '#2F6F8F', 'GU', 'Edda Fairweather', 'Sound money, safe streets, steady hands.',    'Centre-right: order, balanced books and the old guild privileges.'),
  ('Coastal Independents',     '#7A8594', 'CI', 'Various',         'Each port speaks for itself.',                 'Independents with no fixed programme.'),
  ('Miners'' and Smallholders'' Front', '#A8433A', 'MS', 'Orla Pendry', 'Those who dig it and grow it should share in it.', 'Pit villages and small farms: wages, co-operatives, protection from cheap imports.'),
  ('Eryndor Enterprise Party', '#CFA23A', 'EE', 'Jasper Thorne',   'Let the land and the mines pay their way.',    'Landowners and mine owners: low taxes, exports, light regulation.'),
  ('Homestead Union',          '#3E7A52', 'HU', 'Greta Ashdown',   'Keep faith with the old ways.',                'Rural conservatives: order, thrift and the village before the city.'),
  ('Highland Independents',    '#7A8594', 'HI', 'Various',         'No party owns the hills.',                     'Independents with no fixed programme.')
) AS v(name, color, mono, leader, motto, blurb) ON v.name = p.name
WHERE p.is_npc = TRUE
ON CONFLICT (party_id) DO NOTHING;

INSERT INTO pol_state_policy (state_id, active_policies, updated_arc)
SELECT id, '{"taxation": "standard", "labor": "regulated", "environment": "standard", "welfare": "standard"}'::jsonb, 0
FROM pol_states WHERE code IN ('westmark', 'eryndor')
ON CONFLICT (state_id) DO NOTHING;
